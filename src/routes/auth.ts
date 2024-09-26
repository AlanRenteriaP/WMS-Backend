    import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, {JwtPayload} from 'jsonwebtoken';
import pool from '../database';
import dotenv from 'dotenv';
import { QueryResult } from 'pg';
import { Secret } from 'jsonwebtoken';
dotenv.config();
const router = express.Router();
const saltRounds = Number(process.env.SALT_ROUNDS) || 10;


interface UserRole {
    role_name: string;
    role_key: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    password_hash: string;
    job_title: string;
    employment_start_date: Date | null;
    roles: UserRole[];
}


router.post('/login', async (req: Request, res: Response): Promise<Response | void> => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Both email and password are required.' });
    }

    try {
        const userQuery = `
            SELECT
                users.id,
                users.name,
                users.email,
                users.password_hash,
                users_information.job_title,
                users_information.employment_start_date,
                json_agg(json_build_object('role_name', role_definitions.role_name, 'role_key', role_definitions.role_key)) as roles
            FROM
                public.users
            LEFT JOIN
                public.users_information ON users.users_information_id = users_information.users_information_id
            LEFT JOIN
                public.user_role_assignments ON users.id = user_role_assignments.user_id
            LEFT JOIN
                public.role_definitions ON user_role_assignments.role_id = role_definitions.id
            WHERE
                users.email = $1
            GROUP BY
                users.id, users_information.job_title, users_information.employment_start_date
        `;
        const { rows } = await pool.query(userQuery, [email]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid user or password.' });
        }

        const user: User = rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid user or password.' });
        }

        const generateToken = (user: User): string => {
            const payload = {
                id: user.id,
                name: user.name,
                email: user.email,
                job_title: user.job_title,
                employment_start_date: user.employment_start_date,
                roles: user.roles,
            };
            const secret = process.env.JWT_SECRET;
            if (!secret) {
                throw new Error('JWT_SECRET is not defined in the environment variables');
            }
            return jwt.sign(payload, secret); // Optionally add token expiration
        };

        const token = generateToken(user);
        // Set the token as an HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Use secure in production
            sameSite: 'strict', // Strict same-site policy
            path: '/' // Ensure cookie is sent for all requests
        });

        return res.status(200).json({ message: 'Logged in successfully' });
    } catch (error: any) {
        console.error('Error during login:', error.message);
        return res.status(500).json({ error: 'Server error. Login failed.' });
    }
});

router.get('/decodeToken', async (req: Request, res: Response) => {
    console.log('decoding');
    // Access the token directly from the cookie
    const token = req.cookies['token']; // Make sure the cookie name matches what you set in the login endpoint

    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error('JWT_SECRET is not defined in the environment variables');
    }

    try {
        const payload = jwt.verify(token, secret) as JwtPayload; // Verifies and decodes the token

        res.status(200).json({ payload });
    } catch (error) {
        console.error('Error decoding token:', error);
        res.status(500).json({ error: 'Failed to decode token' });
    }
});




export default router;

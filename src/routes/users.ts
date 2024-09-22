// src/routes/users.ts
import express, { Request, Response } from 'express';
import pool from '../database'; // Assuming you have a PostgreSQL pool instance like in the auth route

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const usersQuery = `
            SELECT 
                users.id, 
                users.name, 
                users.email, 
                ui.job_title, 
                ui.employment_start_date,
                array_agg(json_build_object('role_name', rd.role_name, 'role_key', rd.role_key)) as roles
            FROM 
                users
            LEFT JOIN 
                users_information ui ON users.users_information_id = ui.users_information_id
            LEFT JOIN 
                user_role_assignments ura ON users.id = ura.user_id
            LEFT JOIN 
                role_definitions rd ON ura.role_id = rd.id
            GROUP BY 
                users.id, users.name, users.email, ui.job_title, ui.employment_start_date
        `;

        const users = await pool.query(usersQuery);
        res.status(200).json(users.rows);
    } catch (error: any) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Server error. Could not retrieve users.' });
    }
});



export default router;

// src/routes/users.ts
import express, { Request, Response } from 'express';
import pool from '../database'; // Assuming you have a PostgreSQL pool instance like in the auth route

const router = express.Router();
router.get('/', async (req: Request, res: Response) => {
    try {
        const usersQuery = `SELECT * FROM client_stores;`;

        const stores = await pool.query(usersQuery);
        res.status(200).json(stores.rows);
    } catch (error: any) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Server error. Could not retrieve users.' });
    }
});

router.post('/addstore', async (req: Request, res: Response) => {
    try {
        const {
            storeName,
            storeAddress,
            storePhoneNumber,
            storeEmail,
            storeContactPerson,
            storeContactTitle,
            storeAlternatePhoneNumber,
            storeType,
            notes,
            storeBranch,
        } = req.body;

        console.log('HERE STARTS ');
        console.log(req.body);
        console.log('HERE ENDS ');

        const insertQuery = `
            INSERT INTO stores (
                store_name, 
                store_address, 
                store_phone_number, 
                store_email, 
                store_contact_person, 
                store_contact_title, 
                store_alternate_phone_number, 
                store_type, 
                notes, 
                branch  -- Use the correct column name here
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;

        const result = await pool.query(insertQuery, [
            storeName,
            storeAddress,
            storePhoneNumber,
            storeEmail,
            storeContactPerson,
            storeContactTitle,
            storeAlternatePhoneNumber,
            storeType,
            notes,
            storeBranch,  // Passing the correct key
        ]);

        console.log('New store added:', result.rows[0]);

        res.status(201).json({ message: 'Store added successfully!', store: result.rows[0] });
    } catch (error: any) {
        console.error('Error adding store:', error.message);
        res.status(500).json({ error: 'Server error. Could not add store.' });
    }
});



export default router;

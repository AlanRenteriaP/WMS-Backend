import express, { Request, Response } from 'express';
import pool from '../../database'; // Assuming you have a pool connection set up
import { QueryResult } from 'pg';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {


        // Send the result back as JSON
        res.status(200).json("This is source stores from the database");
    } catch (error: any) {
        console.error('Error fetching products:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch products.' });
    }
});


router.get('/brands', async (req: Request, res: Response) => {
    try {
        // Query to get all products from the database
        const products: QueryResult = await pool.query('SELECT * FROM products_variants');

        // Send the result back as JSON
        res.status(200).json(products.rows);
    } catch (error: any) {
        console.error('Error fetching products:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch products.' });
    }
});




export default router;

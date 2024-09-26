import express, { Request, Response } from 'express';
import pool from '../../database';
import {validateRequest} from '../../middleware/validate';
import {storeSchema, StoreInput, storeIdSchema, StoreIdInput} from "../../schemas";

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {

        // Send the result back as JSON
        res.status(200).json({
            message: "Supplier endpoint response",
            status: "success",
        });

    } catch (error: any) {
        console.error('Error fetching products:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch products.' });
    }
});

router.get('/getstores', async (req: Request, res: Response) => {
    try {
        const suppliersQuery = `SELECT * FROM suppliers`;

        const stores = await pool.query(suppliersQuery);
        res.status(200).json({
            message: 'Stores fetched successfully.',
            stores: stores.rows,
        });
    } catch (error: any) {
        console.error('Error fetching stores:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch stores.' });
    }
});

router.post('/addstore', validateRequest({ body: storeSchema }), async (req: Request, res: Response) => {
    try {
        const { store_name, location } = req.body as StoreInput;

        const insertQuery = `
      INSERT INTO suppliers (store_name, location)
      VALUES ($1, $2)
      RETURNING supplier_id, store_name, location;
    `;
        const insertValues = [store_name.trim(), location ? location.trim() : null];

        const result = await pool.query(insertQuery, insertValues);

        res.status(201).json({
            message: 'Store added successfully.',
            store: result.rows[0],
        });
    } catch (error: any) {
        console.error('Error adding store:', error.message);
        res.status(500).json({ error: 'Server error. Failed to add store.' });
    }
});



router.get('/getstorebyid/:id', validateRequest({ params: storeIdSchema }), async (req: Request, res: Response) => {
        const { id } = req.params as unknown as StoreIdInput; // Workaround for TypeScript

        try {
            const suppliersQuery = `SELECT * FROM suppliers WHERE supplier_id = $1`;
            const values = [id];

            const storeResult = await pool.query(suppliersQuery, values);

            if (storeResult.rows.length === 0) {
                return res.status(404).json({ error: 'Store not found.' });
            }

            res.status(200).json({
                message: 'Store fetched successfully.',
                store: storeResult.rows[0],
            });
        } catch (error: any) {
            console.error('Error fetching store:', error.message);
            res.status(500).json({ error: 'Server error. Failed to fetch store.' });
        }
    }
);

router.put('/updatestore/:id', validateRequest({ params: storeIdSchema, body: storeSchema }), async (req: Request, res: Response) => {
    const { id } = req.params as unknown as StoreIdInput;
    const { store_name, location} = req.body as StoreInput;

    try {
        // SQL query to update store details
        const updateQuery = `
                UPDATE suppliers 
                SET 
                    store_name = $1, 
                    location = $2
                WHERE supplier_id = $3
                RETURNING *;`;
        const values = [store_name, location, id];


        const updateResult = await pool.query(updateQuery, values);

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Store not found or no update was made.' });
        }

        res.status(200).json({
            message: 'Store updated successfully.',
            store: updateResult.rows[0],
        });
    } catch (error: any) {
        console.error('Error updating store:', error.message);
        res.status(500).json({ error: 'Server error. Failed to update store.' });
    }
});


router.delete('/deletestore/:id', validateRequest({ params: storeIdSchema }), async (req: Request, res: Response) => {
    const { id } = req.params as unknown as StoreIdInput;

    try {
        // SQL query to delete store details
        const deleteQuery = `
                DELETE FROM suppliers 
                WHERE supplier_id = $1
                RETURNING *;`; // This returns the deleted row
        const values = [id];

        const deleteResult = await pool.query(deleteQuery, values);

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Store not found or no deletion was made.' });
        }

        res.status(200).json({
            message: 'Store deleted successfully.',
            store: deleteResult.rows[0],
        });
    } catch (error: any) {
        console.error('Error deleting store:', error.message);
        res.status(500).json({ error: 'Server error. Failed to delete store.' });
    }
});






export default router;

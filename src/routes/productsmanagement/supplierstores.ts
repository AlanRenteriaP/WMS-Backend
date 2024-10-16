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

        const suppliers = await pool.query(suppliersQuery);
        res.status(200).json({
            message: 'Stores fetched successfully.',
            suppliers: suppliers.rows,
        });
    } catch (error: any) {
        console.error('Error fetching stores:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch stores.' });
    }
});

router.get('/overview', async (req: Request, res: Response) => {
    try {
        const suppliersQuery = `
WITH supplier_ingredients AS (
    SELECT 
        s.supplier_id,
        COALESCE(i.ingredient_id, 0) AS ingredient_id,
        COALESCE(i.ingredient_name, 'Miscellaneous') AS ingredient_name,
        COUNT(p.product_id) AS products_count,
        COALESCE(
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'product_id', p.product_id,
                    'brand_id', p.brand_id,
                    'brand_name', b.brand_name,
                    'package_size', p.package_size,
                    'unit_id', p.unit_id,
                    'abbreviation', u.abbreviation,
                    'default_supplier_product_id', p.default_supplier_product_id
                ) ORDER BY p.product_id
            ) FILTER (WHERE p.product_id IS NOT NULL),
            '[]'
        )::json AS products
    FROM 
        public.suppliers s
    LEFT JOIN 
        public.suppliers_products sp ON s.supplier_id = sp.supplier_id
    LEFT JOIN 
        public.products p ON sp.product_id = p.product_id
    LEFT JOIN 
        public.brands b ON p.brand_id = b.brand_id
    LEFT JOIN
        public.units u ON p.unit_id = u.unit_id
    LEFT JOIN 
        public.ingredients i ON p.ingredient_id = i.ingredient_id
    GROUP BY 
        s.supplier_id,
        COALESCE(i.ingredient_id, 0),
        COALESCE(i.ingredient_name, 'Miscellaneous')
)

SELECT 
    s.*,
    COUNT(DISTINCT si.ingredient_id) FILTER (WHERE si.products_count > 0) AS ingredient_count,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'ingredient_id', si.ingredient_id,
                'ingredient_name', si.ingredient_name,
                'products_count', si.products_count,
                'products', si.products
            ) ORDER BY si.ingredient_name
        ) FILTER (
            WHERE si.products_count > 0
        ),
        '[]'
    ) AS ingredients
FROM 
    public.suppliers s
LEFT JOIN 
    supplier_ingredients si ON s.supplier_id = si.supplier_id
GROUP BY 
    s.supplier_id,
    s.supplier_name,
    s.location;
        `;

        const suppliers = await pool.query(suppliersQuery);
        res.status(200).json({
            message: 'Stores fetched successfully.',
            suppliers: suppliers.rows,
        });
    } catch (error: any) {
        console.error('Error fetching suppliers:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch stores.' });
    }
});


router.post('/addsupplier', validateRequest({ body: storeSchema }), async (req: Request, res: Response) => {
    try {
        const { supplier_name, location } = req.body as StoreInput;

        const insertQuery = `
      INSERT INTO suppliers (supplier_name, location)
      VALUES ($1, $2)
      RETURNING supplier_id, supplier_name, location;
    `;
        const insertValues = [supplier_name.trim(), location ? location.trim() : null];

        const result = await pool.query(insertQuery, insertValues);

        res.status(201).json({
            message: 'Store added successfully.',
            supplier: result.rows[0],
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
    const { supplier_name, location} = req.body as StoreInput;

    try {
        // SQL query to update store details
        const updateQuery = `
                UPDATE suppliers 
                SET 
                    supplier_name = $1, 
                    location = $2
                WHERE supplier_id = $3
                RETURNING *;`;
        const values = [supplier_name, location, id];


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

import express, { Request, Response } from 'express';
import pool from '../../database';
import {validateRequest} from '../../middleware/validate';
import {supplierSchema, StoreInput, supplierIdSchema, StoreIdInput} from "../../schemas";

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {

        // Send the result back as JSON
        res.status(200).json({
            message: "Supplier endpoint response",
            status: "success",
        });

    } catch (error: any) {
        console.error('Error fetching productsSchema:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch productsSchema.' });
    }
});

router.get('/getsuppliers', async (req: Request, res: Response) => {
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
            suppliersOverview: suppliers.rows,
        });
    } catch (error: any) {
        console.error('Error fetching suppliers:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch stores.' });
    }
});


router.post('/addsupplier', validateRequest({ body: supplierSchema }), async (req: Request, res: Response) => {
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






export default router;

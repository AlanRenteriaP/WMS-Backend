import express, { Request, Response } from 'express';
import pool from '../../database'; // Assuming you have a pool connection set up
import { QueryResult } from 'pg';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        // Query to get all products from the database
        const products: QueryResult = await pool.query('SELECT * FROM products');

        // Send the result back as JSON
        res.status(200).json(products.rows);
    } catch (error: any) {
        console.error('Error fetching products:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch products.' });
    }
});

router.get('/products_variants', async (req: Request, res: Response) => {
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

router.get('/products_with_variants', async (req: Request, res: Response) => {
    try {
        const productsWithVariants: QueryResult = await pool.query(`
            SELECT
                p.*,
                pm.name AS measurement_name,
                pm.abbreviation AS measurement_abbreviation,
                MAX(pv.updated_at) AS last_updated,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', pv.id,
                            'product_id', pv.product_id,
                            'sku', pv.sku,
                            'presentation', pv.presentation,
                            'quantity', pv.quantity,
                            'unit', pv.unit,
                            'price', pv.price,
                            'is_active', pv.is_active,
                            'created_at', pv.created_at,
                            'updated_at', pv.updated_at,
                            'sources', pv_sources.sources
                        ) ORDER BY pv.id
                    ) FILTER (WHERE pv.id IS NOT NULL),
                    '[]'
                ) AS variants
            FROM products p
            LEFT JOIN products_measurement pm ON p.measurement_id = pm.id
            LEFT JOIN products_variants pv ON p.id = pv.product_id
            LEFT JOIN (
                SELECT
                    ps.product_variant_id,
                    json_agg(ss.name) AS sources
                FROM products_sourcing ps
                JOIN source_stores ss ON ps.source_store_id = ss.id
                GROUP BY ps.product_variant_id
            ) pv_sources ON pv.id = pv_sources.product_variant_id
            GROUP BY p.id, pm.name, pm.abbreviation
        `);

        res.status(200).json(productsWithVariants.rows);
    } catch (error: any) {
        console.error('Error fetching products with variants:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch products with variants.' });
    }
});


// Route to add a new product variant
router.post('/:productId/variants', async (req: Request, res: Response) => {
    const { productId } = req.params;
    const {
        presentation,
        quantity,
        unit,
        price,
        source,
    } = req.body;

    try {
        // Validate input data
        if (!presentation || !unit || price === undefined || quantity === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Insert the new variant into the database
        const result = await pool.query(
            `
      INSERT INTO products_variants 
        (product_id, sku, presentation, quantity, unit, price, source, created_at, updated_at, is_active)
      VALUES
        ($1, (SELECT CONCAT($1, LPAD(COALESCE(MAX(id), 0) + 1::text, 4, '0')) FROM products_variants WHERE product_id = $1), $2, $3, $4, $5, $6, NOW(), NOW(), true)
      RETURNING *
      `,
            [productId, presentation, quantity, unit, price, source]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error adding product variant:', error.message);
        res.status(500).json({ error: 'Server error. Failed to add product variant.' });
    }
});

router.get('/sourcestores', async (req: Request, res: Response) => {
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

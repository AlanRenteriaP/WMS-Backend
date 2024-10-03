import express, { Request, Response } from 'express';
import pool from '../../database';
import {validateRequest} from '../../middleware/validate';
import {
    productSchema,
    productIdSchema,
    productUpdateSchema,
    ProductIdInput,
    ProductInput,
    ProductUpdateInput,
    unitUpdateInput
} from "../../schemas";

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {


        // Send the result back as JSON
        res.status(200).json("Inside Product API CAll");
    } catch (error: any) {
        console.error('Error fetching products:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch products.' });
    }
});

router.get('/getproducts', async (req: Request, res: Response) => {
    try {
        const productsQuery = `SELECT * FROM products;`;
        const result = await pool.query(productsQuery);
        res.status(200).json(result.rows);
    } catch (error: any) {
        console.error('Error fetching products:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch products.' });
    }
});

router.post('/addproducts', validateRequest({ body: productSchema }), async (req: Request, res: Response) => {
    const { product_name, default_unit_id, category, default_variant_id } = req.body;

    try {
        const insertProductQuery = `
            INSERT INTO products (product_name, default_unit_id, category, default_variant_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const result = await pool.query(insertProductQuery, [product_name, default_unit_id, category, default_variant_id]);
        res.status(201).json({
            message: 'Product added successfully.',
            product: result.rows[0]
        });
    } catch (error: any) {
        console.error('Error adding product:', error.message);
        res.status(500).json({ error: 'Server error. Failed to add product.' });
    }
});

router.get('/getproduct/:id', validateRequest({ params: productIdSchema }), async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const getProductQuery = `
            SELECT * FROM products WHERE product_id = $1;
        `;
        const result = await pool.query(getProductQuery, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error fetching product:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch product.' });
    }
});


router.put('/updateproduct/:id', validateRequest({ params: productIdSchema, body: productUpdateSchema }), async (req: Request, res: Response) => {
    try {
        const { id } = req.params as unknown as ProductIdInput;
        type ExtendedUnitUpdateInput = ProductUpdateInput & { [key: string]: any };
        const updateData = req.body as ExtendedUnitUpdateInput;
        // Construct the SQL update query dynamically based on provided fields
        const keys = Object.keys(updateData).filter(key => updateData[key] !== undefined);
        const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
        const values = keys.map(key => updateData[key]);

        if (keys.length === 0) {
            return res.status(400).json({ error: 'No valid fields provided for update' });
        }

        const sqlQuery = `
            UPDATE products
            SET ${setClause}
            WHERE product_id = $${keys.length + 1}
            RETURNING *;
        `;

        const result = await pool.query(sqlQuery, [...values, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error:any) {
        console.error('Error updating product:', error.message);
        res.status(500).json({ error: 'Server error. Failed to update product.' });
    }
});

router.delete('/deleteproduct/:id', validateRequest({ params: productIdSchema }), async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const deleteProductQuery = `
            DELETE FROM products
            WHERE product_id = $1
            RETURNING *;
        `;
        const result = await pool.query(deleteProductQuery, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        res.status(200).json({
            message: 'Product deleted successfully.',
            deletedProduct: result.rows[0]
        });
    } catch (error: any) {
        console.error('Error deleting product:', error.message);
        res.status(500).json({ error: 'Server error. Failed to delete product.' });
    }
});

router.get('/overview', async (req: Request, res: Response) => {
    try {
        // Extract optional category filter from query parameters
        const categoryFilter = req.query.category as string | undefined;

        // Base SQL query to fetch products and their variants
        const productsQuery = `
SELECT
    p.product_id,
    p.product_name,
    p.default_variant_id,
    u.unit_name AS measurement,
    COUNT(DISTINCT v.variant_id) AS number_of_variants,
    CONCAT('$', MIN(pp_all.price), ' - $', MAX(pp_all.price)) AS price_range,
    MAX(pp_all.price_date) AS last_updated,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'variant_id', v.variant_id,
                'upc', v.upc,
                'presentation', CONCAT(v.package_size, ' ', vu.unit_name),
                'price', pp.price,
                'brand', b.brand_name,
                'supplier', s.supplier_name,  -- Adding supplier name
                'last_updated', pp.price_date,
                'is_default', (v.variant_id = p.default_variant_id)
            )
        ) FILTER (WHERE v.variant_id IS NOT NULL),
        '[]'
    ) AS variants
FROM
    public.products p
LEFT JOIN
    public.units u ON p.default_unit_id = u.unit_id
LEFT JOIN
    public.product_variants v ON p.product_id = v.product_id
LEFT JOIN
    public.units vu ON v.unit_id = vu.unit_id
LEFT JOIN
    public.brands b ON v.brand_id = b.brand_id
LEFT JOIN
    public.suppliers_products sp ON v.variant_id = sp.variant_id  -- Join with suppliers_products table
LEFT JOIN
    public.suppliers s ON sp.supplier_id = s.supplier_id  -- Join with suppliers table
LEFT JOIN
    public.product_prices pp_all ON v.variant_id = pp_all.variant_id
LEFT JOIN LATERAL (
    SELECT pp.variant_id, pp.price, pp.price_date
    FROM public.product_prices pp
    WHERE pp.variant_id = v.variant_id
    ORDER BY pp.price_date DESC
    LIMIT 1
) pp ON true
GROUP BY
    p.product_id, p.product_name, p.default_variant_id, u.unit_name
ORDER BY
    p.product_name;
        `;

        // Parameters for the parameterized query
        const queryParams = categoryFilter ? [categoryFilter] : [];

        // Execute the query using parameterized inputs to prevent SQL injection
        const { rows } = await pool.query(productsQuery, queryParams);

        // Respond with the retrieved products and variants
        res.status(200).json({
            message: 'Products fetched successfully.',
            products: rows,
        });
    } catch (error: any) {
        console.error('Error fetching products:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch products.' });
    }
});


export default router;

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



export default router;

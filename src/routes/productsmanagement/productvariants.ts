import express, { Request, Response } from 'express';
import pool from '../../database'; // Assuming you have a pool connection set up
import { QueryResult } from 'pg';
import {validateRequest} from "../../middleware/validate";
import {
    productVariantSchema,
    ProductVariantInput,
    ProductVariantIdInput,
    productVariantIdSchema,
    ProductVariantUpdateInput,
    productVariantUpdateSchema, productIdSchema,
} from "../../schemas";

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
         // Send the result back as JSON
        res.status(200).json("Inside Product_VARIANT API CAll");
    } catch (error: any) {
        console.error('Error fetching products:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch products.' });
    }
});

router.get('/getall', async (req: Request, res: Response) => {
    try {
        const productsQuery = `SELECT * FROM product_variants;`;
        const result = await pool.query(productsQuery);
        res.status(200).json(result.rows);
    } catch (error: any) {
        console.error('Error fetching products:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch products.' });
    }

});



// Route to add or update a product variant
router.post('/addvariant', validateRequest({ body: productVariantSchema }), async (req: Request, res: Response) => {
    const variantData = req.body as ProductVariantInput;
    console.log(variantData);
    const { store_product_id, brand_id, package_size, unit_id, upc, attributes } = req.body as ProductVariantInput;

    try {
        const insertVariantQuery = `
            INSERT INTO product_variants (store_product_id, brand_id, package_size, unit_id, upc, attributes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const result = await pool.query(insertVariantQuery, [store_product_id, brand_id, package_size, unit_id, upc, attributes]);
        res.status(201).json({
            message: 'Variant added successfully.',
            variant: result.rows[0]
        });
    } catch (error: any) {
        console.error('Error adding variant:', error.message);
        res.status(500).json({ error: 'Server error. Failed to add variant.' });
    }
});

// Route to get a product variant by ID
router.get('/getvariant/:id', validateRequest({ params: productVariantIdSchema }), async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ProductVariantIdInput;

    try {
        const getVariantQuery = `
            SELECT * FROM product_variants WHERE variant_id = $1;
        `;
        const result = await pool.query(getVariantQuery, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Variant not found.' });
        }
        res.status(200).json({
            message: 'Variant retrieved successfully.',
            variant: result.rows[0]
        });
    } catch (error: any) {
        console.error('Error getting variant:', error.message);
        res.status(500).json({ error: 'Server error. Failed to get variant.' });
    }
});

// Route to update a product variant
router.put('/updatevariant/:id', validateRequest({ params: productVariantIdSchema, body: productVariantUpdateSchema }), async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ProductVariantIdInput;
    type ExtendedVariantUpdateInput = ProductVariantUpdateInput & { [key: string]: any };
    const updateData = req.body as ExtendedVariantUpdateInput;

    // Construct parts of the SQL query dynamically based on provided fields
    const fields = Object.keys(updateData).filter(key => updateData[key] !== undefined);
    const values = fields.map(key => updateData[key]);
    const setParts = fields.map((key, index) => `${key} = $${index + 1}`);

    if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    const sqlQuery = `
        UPDATE product_variants
        SET ${setParts.join(', ')}
        WHERE variant_id = $${fields.length + 1}
        RETURNING *;
    `;

    try {
        const result = await pool.query(sqlQuery, [...values, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Variant not found.' });
        }
        res.status(200).json({
            message: 'Variant updated successfully.',
            variant: result.rows[0]
        });
    } catch (error: any) {
        console.error('Error updating variant:', error.message);
        res.status(500).json({ error: 'Server error. Failed to update variant.' });
    }
});


router.delete('/deleteVariant/:id', validateRequest({ params: productVariantIdSchema }), async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const deleteProductQuery = `
            DELETE FROM product_variants
            WHERE variant_id = $1
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
        console.error('Error deleting variant:', error.message);
        res.status(500).json({ error: 'Server error. Failed to delete product.' });
    }
});





export default router;

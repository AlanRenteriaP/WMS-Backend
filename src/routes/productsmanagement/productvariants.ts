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
    console.log('Adding the Variant');

    const {
        product_id,
        supplier_id,
        brand_id,
        package_size,
        unit_id,
        price // Including price from the request payload
    } = variantData;

    try {
        // Validate that product exists
        const productResult = await pool.query('SELECT * FROM products WHERE product_id = $1', [product_id]);
        if (productResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid product_id. Product does not exist.' });
        }

        // Validate that supplier exists
        const supplierResult = await pool.query('SELECT * FROM suppliers WHERE supplier_id = $1', [supplier_id]);
        if (supplierResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid supplier_id. Supplier does not exist.' });
        }

        // Validate that brand exists
        const brandResult = await pool.query('SELECT * FROM brands WHERE brand_id = $1', [brand_id]);
        if (brandResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid brand_id. Brand does not exist.' });
        }

        // Insert the new product variant
        const insertVariantQuery = `
            INSERT INTO product_variants (product_id, brand_id, package_size, unit_id)
            VALUES ($1, $2, $3, $4)
            RETURNING variant_id;
        `;
        const variantResult = await pool.query(insertVariantQuery, [
            product_id,
            brand_id,
            package_size,
            unit_id
        ]);

        const variant_id = variantResult.rows[0].variant_id;

        // Insert the association between supplier and product variant into the suppliers_products table
        const insertSupplierProductQuery = `
            INSERT INTO suppliers_products (supplier_id, variant_id)
            VALUES ($1, $2)
            RETURNING *;
        `;
        await pool.query(insertSupplierProductQuery, [
            supplier_id,
            variant_id
        ]);

        // Insert the price for the new product variant into the product_prices table
        const insertPriceQuery = `
            INSERT INTO product_prices (variant_id, price, price_date, currency)
            VALUES ($1, $2, NOW(), 'MXN')
            RETURNING *;
        `;
        const priceResult = await pool.query(insertPriceQuery, [
            variant_id,
            price
        ]);

        res.status(201).json({
            message: 'Variant, supplier association, and price added successfully.',
            variant: variantResult.rows[0],
            price: priceResult.rows[0]
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

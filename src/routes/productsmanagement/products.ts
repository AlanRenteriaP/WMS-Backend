import express, { Request, Response } from 'express';
import pool from '../../database'; // Assuming you have a pool connection set up
import { QueryResult } from 'pg';
import {validateRequest} from "../../middleware/validate";
import {
    addProductSchema,
    AddProductInput
} from "../../schemas";

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
         // Send the result back as JSON
        res.status(200).json("Inside Product_VARIANT API CAll");
    } catch (error: any) {
        console.error('Error fetching productsSchema:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch productsSchema.' });
    }
});




router.get('/getall', async (req: Request, res: Response) => {
    try {
        const productsQuery =
            `SELECT
  p.product_id,
  p.brand_id,
  p.package_size,
  p.unit_id,
  p.ingredient_id,
  p.default_supplier_product_id,
  b.brand_name,
  u.abbreviation,
  s.supplier_name AS default_supplier,
  i.ingredient_name
FROM public.products p
LEFT JOIN public.brands b ON p.brand_id = b.brand_id
LEFT JOIN public.units u ON p.unit_id = u.unit_id
LEFT JOIN public.ingredients i ON p.ingredient_id = i.ingredient_id
LEFT JOIN public.suppliers_products sp ON p.default_supplier_product_id = sp.supplier_product_id
LEFT JOIN public.suppliers s ON sp.supplier_id = s.supplier_id;
`;

        const { rows: products }  = await pool.query(productsQuery);


        res.status(200).json({
            message: 'Products fetched successfully.',
            products: products,
        });
    } catch (error: any) {
        console.error('Error fetching productsSchema:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch productsSchema.' });
    }

});


router.post('/add', validateRequest({ body: addProductSchema }), async (req: Request, res: Response) => {
    const productData = req.body as AddProductInput;
    console.log(productData);
    console.log('Adding the product');

    const {
        brand_id,
        package_size,
        unit_id,
        ingredient_id,
        default_supplier_product_id,
    } = productData;

    try {
        // Validate that brand exists
        const brandResult = await pool.query('SELECT * FROM brands WHERE brand_id = $1', [brand_id]);
        if (brandResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid brand_id. Brand does not exist.' });
        }

        // Validate that unit exists
        const unitResult = await pool.query('SELECT * FROM units WHERE unit_id = $1', [unit_id]);
        if (unitResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid unit_id. Unit does not exist.' });
        }

        // Validate that ingredient exists (if provided)
        if (ingredient_id !== undefined) {
            const ingredientResult = await pool.query('SELECT * FROM ingredients WHERE ingredient_id = $1', [ingredient_id]);
            if (ingredientResult.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid ingredient_id. Ingredient does not exist.' });
            }
        }

        // Validate that default_supplier_product_id exists (if provided)
        if (default_supplier_product_id !== undefined) {
            const supplierProductResult = await pool.query('SELECT * FROM suppliers_products WHERE supplier_product_id = $1', [default_supplier_product_id]);
            if (supplierProductResult.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid default_supplier_product_id. Supplier does not sell this product.' });
            }
        }

        // Insert the new product
        const insertProductQuery = `
      INSERT INTO products (brand_id, package_size, unit_id, ingredient_id, default_supplier_product_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
        const productResult = await pool.query(insertProductQuery, [
            brand_id,
            package_size,
            unit_id,
            ingredient_id || null,
            default_supplier_product_id || null,
        ]);

        const newProduct = productResult.rows[0];

        res.status(201).json({
            message: 'Product added successfully.',
            product: newProduct,
        });
    } catch (error: any) {
        console.error('Error adding product:', error.message);
        res.status(500).json({ error: 'Server error. Failed to add product.' });
    }
});

// add supplier price
// add supplier price
router.post('/addsupplierprice', async (req: Request, res: Response) => {
    const { supplier_id, product_id, price } = req.body;
    console.log(supplier_id, product_id, price);

    // Input validation (you can use a library like Zod or express-validator)
    if (!supplier_id || !product_id || !price) {
        return res.status(400).json({ error: 'Missing required parameters: supplier_id, product_id, or price' });
    }

    try {
        // Step 1: Insert into suppliers_products if not already existing
        let supplierProductId;
        const supplierProductQuery = `
            INSERT INTO "public".suppliers_products (supplier_id, product_id)
            VALUES ($1, $2)
            ON CONFLICT (supplier_id, product_id) DO NOTHING
            RETURNING supplier_product_id;
        `;
        const supplierProductResult = await pool.query(supplierProductQuery, [supplier_id, product_id]);

        // If the supplier-product already exists, get its ID
        if (supplierProductResult.rowCount === 0) {
            const existingSupplierProduct = await pool.query(
                `SELECT supplier_product_id FROM "public".suppliers_products WHERE supplier_id = $1 AND product_id = $2`,
                [supplier_id, product_id]
            );
            supplierProductId = existingSupplierProduct.rows[0].supplier_product_id;
        } else {
            supplierProductId = supplierProductResult.rows[0].supplier_product_id;
        }

        // Step 2: Insert price into product_prices
        const priceQuery = `
            INSERT INTO "public".product_prices (price_date, price, supplier_product_id)
            VALUES (CURRENT_DATE, $1, $2)
            RETURNING price_id;
        `;
        const priceResult = await pool.query(priceQuery, [price, supplierProductId]);
        const priceId = priceResult.rows[0].price_id;

        // Step 3: Check if this is the first price for the supplier_product_id
        const priceCountQuery = `
            SELECT COUNT(*) FROM "public".product_prices WHERE supplier_product_id = $1;
        `;
        const priceCountResult = await pool.query(priceCountQuery, [supplierProductId]);
        const priceCount = parseInt(priceCountResult.rows[0].count, 10);

        // Step 4: If it's the first price, update the default_price_id in suppliers_products
        if (priceCount === 1) {
            const updateDefaultPriceQuery = `
                UPDATE "public".suppliers_products
                SET default_price_id = $1
                WHERE supplier_product_id = $2;
            `;
            await pool.query(updateDefaultPriceQuery, [priceId, supplierProductId]);
        }

        // Step 5: Check if the product has a default_supplier_product_id set
        const defaultSupplierQuery = `
            SELECT default_supplier_product_id FROM "public".products WHERE product_id = $1;
        `;
        const defaultSupplierResult = await pool.query(defaultSupplierQuery, [product_id]);

        const defaultSupplierProductId = defaultSupplierResult.rows[0].default_supplier_product_id;

        // Step 6: If the product doesn't have a default_supplier_product_id, update it with the new supplier_product_id
        if (!defaultSupplierProductId) {
            const updateDefaultSupplierQuery = `
                UPDATE "public".products
                SET default_supplier_product_id = $1
                WHERE product_id = $2;
            `;
            await pool.query(updateDefaultSupplierQuery, [supplierProductId, product_id]);
        }

        // Step 7: Send a success response
        res.status(200).json({ message: 'Supplier price added successfully' });

    } catch (error: any) {
        console.error('Error adding supplier price:', error.message);
        res.status(500).json({ error: 'Server error. Failed to add supplier price.' });
    }
});

router.get('/SupplierPricebyId', async (req: Request, res: Response) => {
    const { product_id } = req.query;

    // Validate product_id
    if (!product_id) {
        return res.status(400).json({ error: 'Missing required parameter: product_id' });
    }

    try {
        // Query to get suppliers associated with the product_id and their default price
        const query = `
            SELECT s.supplier_id, 
                   s.supplier_name, 
                   pp.price AS default_price,
                   CASE WHEN sp.supplier_product_id = p.default_supplier_product_id THEN true ELSE false END AS is_default
            FROM "public".suppliers s
            JOIN "public".suppliers_products sp ON s.supplier_id = sp.supplier_id
            LEFT JOIN "public".product_prices pp ON sp.default_price_id = pp.price_id
            JOIN "public".products p ON sp.product_id = p.product_id
            WHERE sp.product_id = $1;
        `;
        const result = await pool.query(query, [product_id]);

        // Check if any suppliers were found
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'No suppliers found for the given product_id.' });
        }

        // Send the result back as JSON
        res.status(200).json(result.rows);
    } catch (error: any) {
        console.error('Error fetching suppliers for the product:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch suppliers for the product.' });
    }
});


export default router;

import express, { Request, Response } from 'express';
import pool from '../../database';
import {validateRequest} from '../../middleware/validate';
import {  ingredientSchema } from "../../schemas/productsmanagement/ingredientSchema";

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {


        // Send the result back as JSON
        res.status(200).json("Inside Ingredients API CAll");
    } catch (error: any) {
        console.error('Error fetching productsSchema:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch productsSchema.' });
    }
});

router.get('/overview', async (req: Request, res: Response) => {
    try {
        const ingredientsQuery = `
            SELECT 
                i.ingredient_id, 
                i.ingredient_name,
                COUNT(p.product_id) AS products_count,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'product_id', p.product_id,
                            'brand_id', p.brand_id,
                            'package_size', p.package_size,
                            'unit_id', p.unit_id,
                            'ingredient_id', p.ingredient_id,
                            'default_supplier_product_id', p.default_supplier_product_id,
                            'brand_name', b.brand_name,
                            'abbreviation', u.abbreviation
                        )
                    ) FILTER (WHERE p.product_id IS NOT NULL), '[]'
                ) AS products
            FROM ingredients i
            LEFT JOIN products p ON p.ingredient_id = i.ingredient_id
            LEFT JOIN brands b ON p.brand_id = b.brand_id
            LEFT JOIN units u ON p.unit_id = u.unit_id
            GROUP BY i.ingredient_id, i.ingredient_name
            ORDER BY i.ingredient_id;
        `;

        const { rows: ingredients } = await pool.query(ingredientsQuery);

        // Respond with the retrieved productsSchema and variants
        res.status(200).json({
            message: 'Products fetched successfully.',
            ingredients: ingredients,
        });
    } catch (error: any) {
        console.error('Error fetching productsSchema:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch productsSchema.' });
    }
});
// router.get('/getproducts', async (req: Request, res: Response) => {
//     try {
//         const productsQuery = `SELECT * FROM productsSchema;`;
//         const result = await pool.query(productsQuery);
//         res.status(200).json(result.rows);
//     } catch (error: any) {
//         console.error('Error fetching productsSchema:', error.message);
//         res.status(500).json({ error: 'Server error. Failed to fetch productsSchema.' });
//     }
// });

router.post('/addingredient', validateRequest({ body: ingredientSchema }), async (req: Request, res: Response) => {
    const { ingredient_name, default_unit_id, default_product_id } = req.body;

    try {
        const insertIngredientQuery = `
            INSERT INTO ingredients (ingredient_name, default_unit_id, default_product_id)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;

        const result = await pool.query(insertIngredientQuery, [
            ingredient_name,
            default_unit_id,
            default_product_id || null,
        ]);

        res.status(201).json({
            message: 'Ingredient added successfully.',
            ingredient: result.rows[0],
        });
    } catch (error: any) {
        console.error('Error adding ingredient:', error.message);
        res.status(500).json({ error: 'Server error. Failed to add ingredient.' });
    }
});

// router.get('/getproduct/:id', validateRequest({ params: productIdSchema }), async (req: Request, res: Response) => {
//     const { id } = req.params;
//
//     try {
//         const getProductQuery = `
//             SELECT * FROM productsSchema WHERE product_id = $1;
//         `;
//         const result = await pool.query(getProductQuery, [id]);
//         if (result.rows.length === 0) {
//             return res.status(404).json({ error: 'Product not found.' });
//         }
//         res.status(200).json(result.rows[0]);
//     } catch (error: any) {
//         console.error('Error fetching product:', error.message);
//         res.status(500).json({ error: 'Server error. Failed to fetch product.' });
//     }
// });


// router.put('/updateproduct/:id', validateRequest({ params: productIdSchema, body: productUpdateSchema }), async (req: Request, res: Response) => {
//     try {
//         const { id } = req.params as unknown as ProductIdInput;
//         type ExtendedUnitUpdateInput = ProductUpdateInput & { [key: string]: any };
//         const updateData = req.body as ExtendedUnitUpdateInput;
//         // Construct the SQL update query dynamically based on provided fields
//         const keys = Object.keys(updateData).filter(key => updateData[key] !== undefined);
//         const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
//         const values = keys.map(key => updateData[key]);
//
//         if (keys.length === 0) {
//             return res.status(400).json({ error: 'No valid fields provided for update' });
//         }
//
//         const sqlQuery = `
//             UPDATE productsSchema
//             SET ${setClause}
//             WHERE product_id = $${keys.length + 1}
//             RETURNING *;
//         `;
//
//         const result = await pool.query(sqlQuery, [...values, id]);
//         if (result.rowCount === 0) {
//             return res.status(404).json({ error: 'Product not found.' });
//         }
//         res.status(200).json(result.rows[0]);
//     } catch (error:any) {
//         console.error('Error updating product:', error.message);
//         res.status(500).json({ error: 'Server error. Failed to update product.' });
//     }
// });

// router.delete('/deleteproduct/:id', validateRequest({ params: productIdSchema }), async (req: Request, res: Response) => {
//     const { id } = req.params;
//
//     try {
//         const deleteProductQuery = `
//             DELETE FROM productsSchema
//             WHERE product_id = $1
//             RETURNING *;
//         `;
//         const result = await pool.query(deleteProductQuery, [id]);
//         if (result.rowCount === 0) {
//             return res.status(404).json({ error: 'Product not found.' });
//         }
//         res.status(200).json({
//             message: 'Product deleted successfully.',
//             deletedProduct: result.rows[0]
//         });
//     } catch (error: any) {
//         console.error('Error deleting product:', error.message);
//         res.status(500).json({ error: 'Server error. Failed to delete product.' });
//     }
// });

//
// router.patch('/setActive/:id', validateRequest({ params: productIdSchema }), async (req: Request, res: Response) => {
//     const { id } = req.params as unknown as ProductIdInput;
//
//
//
//     try {
//         const setActiveQuery = `
//             UPDATE productsSchema
//             SET default_variant_id = $1
//             WHERE product_id = (
//                 SELECT product_id
//                 FROM product_variants
//                 WHERE variant_id = $1
//             )
//             RETURNING *;
//         `;
//         const result = await pool.query(setActiveQuery, [id]);
//         if (result.rowCount === 0) {
//             return res.status(404).json({ error: 'Product not found or could not be updated.' });
//         }
//         res.status(200).json({
//             message: 'Product variant set as active successfully.',
//             updatedProduct: result.rows[0],
//         });
//     } catch (error: any) {
//         console.error('Error setting product variant as active:', error.message);
//         res.status(500).json({ error: 'Server error. Failed to set product variant as active.' });
//     }
// });

export default router;

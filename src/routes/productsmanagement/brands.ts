import express, { Request, Response } from 'express';
import pool from '../../database'; // Assuming you have a pool connection set up
import { QueryResult } from 'pg';
import {validateRequest} from "../../middleware/validate";
import {BrandIdInput, brandIdSchema, BrandInput, brandSchema, StoreIdInput, StoreInput} from "../../schemas";
import brands from "./brands";

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const suppliersQuery = `SELECT * FROM brands`;

        const brands = await pool.query(suppliersQuery);
        res.status(200).json({
            message: 'Brands fetched successfully.',
            brands: brands.rows,
        });
    } catch (error: any) {
        console.error('Error fetching stores:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch stores.' });
    }
});

router.get('/overview', async (req: Request, res: Response) => {
    try {
        const brandsQuery = `
          WITH brand_ingredients AS (
    SELECT 
        b.brand_id,
        b.brand_name,
        COALESCE(i.ingredient_id, 0) AS ingredient_id,
        COALESCE(i.ingredient_name, 'Miscellaneous') AS ingredient_name,
        COUNT(p.product_id) AS products_count,
        COALESCE(
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'product_id', p.product_id,
                    'package_size', p.package_size,
                    'unit_id', p.unit_id,
                    'abbreviation', u.abbreviation,
                    'default_supplier_product_id', p.default_supplier_product_id
                ) ORDER BY p.product_id
            ) FILTER (WHERE p.product_id IS NOT NULL),
            '[]'
        )::json AS products
    FROM 
        public.brands b
    LEFT JOIN 
        public.products p ON b.brand_id = p.brand_id
    LEFT JOIN 
        public.units u ON p.unit_id = u.unit_id
    LEFT JOIN 
        public.ingredients i ON p.ingredient_id = i.ingredient_id
    GROUP BY 
        b.brand_id,
        b.brand_name,
        COALESCE(i.ingredient_id, 0),
        COALESCE(i.ingredient_name, 'Miscellaneous')
)

SELECT 
    b.brand_id,
    b.brand_name,
    COUNT(DISTINCT bi.ingredient_id) FILTER (WHERE bi.products_count > 0) AS number_of_ingredients,
    SUM(bi.products_count) AS number_of_products,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'ingredient_id', bi.ingredient_id,
                'ingredient_name', bi.ingredient_name,
                'products_count', bi.products_count,
                'products', bi.products
            ) ORDER BY bi.ingredient_name
        ) FILTER (
            WHERE bi.products_count > 0
        ),
        '[]'
    ) AS ingredients
FROM 
    public.brands b
LEFT JOIN 
    brand_ingredients bi ON b.brand_id = bi.brand_id
GROUP BY 
    b.brand_id,
    b.brand_name;
        `;

        const brands = await pool.query(brandsQuery);
        res.status(200).json({
            message: 'Brands fetched successfully.',
            brands: brands.rows,
        });
    } catch (error: any) {
        console.error('Error fetching brands:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch brands.' });
    }
});

router.post('/addbrand',validateRequest({body: brandSchema}), async (req: Request, res: Response) => {
    try{
        const { brand_name } = req.body;
        const insertQuery= `
        INSERT INTO brands (brand_name) VALUES ($1)
        `;
        const insertValue = [brand_name.trim()];
        const result = await pool.query(insertQuery,insertValue);

        res.status(200).json({
            message: 'Brand added succesfully',
            brand:result.rows[0],
        });
    }catch (error: any) {
        console.error('Error adding brand:', error.message);
        res.status(500).json({ error: 'Server error. Failed to add brand.' });
    }

});


router.get('/getbrandbyid/:id', validateRequest({params: brandIdSchema}), async (req: Request, res: Response) => {
    const { id } = req.params as unknown as BrandIdInput;
try{
    const getBrandIdQuery = `SELECT * FROM brands WHERE brand_id = $1`;
    const value = [id];
    const brandIdResult = await pool.query(getBrandIdQuery,value);

    if (brandIdResult.rows.length === 0) {
        return res.status(404).json({ error: 'No brand found.' });
    }
    res.status(200).json({
        message: 'Brands fetched successfully.',
        brand: brandIdResult.rows[0],
    })
} catch(error:any){
    console.log('Error getting brand:', error.message);
    res.status(500).json({ error: 'Server error. Failed to get brand.' });
}
});


router.put('/updatebrand/:id', validateRequest({params: brandIdSchema, body: brandSchema}), async (req: Request, res: Response) => {
    // Example of accessing the id from params
    const brandId = req.params.id as unknown as BrandIdInput;
    const {brand_name} = req.body as BrandInput;
    try{
        const updateBradQuery = `
        UPDATE brands
        SET
            brand_name = $1
            WHERE brand_id = $2
            RETURNING *;
        `;
        const value = [brand_name,brandId];
        const updateResult = await pool.query(updateBradQuery,value);

        if (updateResult.rows.length === 0) {
            return  res.status(404).json({ error: 'Brand not found or no update was made.' });
        }
        res.status(200).json({
            message: 'Brand fetched successfully.',
            brand: updateResult.rows[0],
        });
    }catch(error:any){
        console.error('Error updating brand:', error.message);
        res.status(500).json({ error: 'Server error. Failed to update brand.' });
    }
});

router.delete('/deletebrand/:id', validateRequest({params: brandIdSchema}), async (req: Request, res: Response) => {
    const { id } = req.params as unknown as BrandIdInput;
    try{
        const deleteQuery = `
                        DELETE FROM brands
                         WHERE brand_id = $1
                         RETURNING *;
                         `;
        const value = [id];
        const deleteResult = await pool.query(deleteQuery,value);

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ error: 'No brand found.' });
        }

        res.status(200).json({
           message: 'Brand deleted successfully.',
           brand: deleteResult.rows[0],
        });
    }catch(error: any){
        console.error('Error deleting brand:', error.message);
        res.status(500).json({ error: 'Server error. Failed to delete brand.' });
    }

});


export default router;



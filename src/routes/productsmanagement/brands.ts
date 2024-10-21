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


router.get('/all', async (req: Request, res: Response) => {
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


export default router;



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


router.get('/prudcts/overview', async (req: Request, res: Response) => {
    try {
        const suppliersQuery = `
            SELECT 
    b.brand_name,
    json_agg(
        json_build_object(
            'product_name', p.product_name,
            'variants', pv.variants
        )
    ) as products
FROM 
    public.brands b
JOIN 
    public.product_variants v ON b.brand_id = v.brand_id
JOIN 
    public.products p ON p.product_id = v.supplier_product_id
LEFT JOIN 
    (
        SELECT 
            p.product_id,
            json_agg(
                json_build_object(
                    'variant_id', v.variant_id,
                    'package_size', v.package_size,
                    'unit_id', v.unit_id,
                    'upc', v.upc,
                    'attributes', v.attributes
                )
            ) as variants
        FROM 
            public.product_variants v
        JOIN 
            public.products p ON p.product_id = v.supplier_product_id
        GROUP BY 
            p.product_id
    ) pv ON pv.product_id = p.product_id
WHERE 
    b.brand_id = v.brand_id
GROUP BY 
    b.brand_id;
        `;

        const stores = await pool.query(suppliersQuery);
        res.status(200).json({
            message: 'Brands fetched successfully.',
            stores: stores.rows,
        });
    } catch (error: any) {
        console.error('Error fetching stores:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch stores.' });
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



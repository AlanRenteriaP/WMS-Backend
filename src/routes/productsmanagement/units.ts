import express, { Request, Response } from 'express';
import pool from '../../database'; // Assuming you have a pool connection set up
import { QueryResult } from 'pg';
import {validateRequest} from "../../middleware/validate";
import {  unitIdSchema, UnitIdInput,  UnitInput,unitSchema, unitUpdateSchema, unitUpdateInput,
} from '../../schemas';
const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
          // Send the result back as JSON
        res.status(200).json({
            message: "Units endpoint response",
            status: "success",
        });

    } catch (error: any) {
        console.error('Error fetching products:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch products.' });
    }
});

router.get('/getunits', async (req: Request, res: Response) => {
   try{
        const unitQuery = `SELECT * FROM units`;
        const units = await pool.query(unitQuery);
        res.status(200).json({
           message: 'Units fetched successfully.',
           units: units.rows,
        })

   } catch(error: any) {
       console.error('Error fetching units:', error.message);
       res.status(500).json({ error: 'Server error. Failed to fetch units.' });
   }
});

router.post('/addunit', validateRequest({ body: unitSchema }), async (req: Request, res: Response) => {
    try {
        const { unit_name, unit_type, conversion_factor_to_base } = req.body as UnitInput;

        // SQL query to insert unit into the database
        const unitQuery = `
            INSERT INTO units (unit_name, unit_type, conversion_factor_to_base)
            VALUES (LOWER($1), $2, $3)
            RETURNING unit_id, unit_name, unit_type, conversion_factor_to_base;
        `;

        // Values to be inserted (with unit_name and unit_type trimmed)
        const insertValues = [unit_name.trim(), unit_type.trim(), conversion_factor_to_base];

        // Execute the query
        const result = await pool.query(unitQuery, insertValues);

        // Respond with the inserted unit
        res.status(201).json({
            message: 'Unit added successfully.',
            unit: result.rows[0],
        });
    } catch (error: any) {
        console.error('Error adding unit:', error.message);
        res.status(500).json({ error: 'Server error. Failed to add unit.' });
    }
});



router.get('/getbrandbyid/:id', validateRequest({ params: unitIdSchema }), async (req: Request, res: Response) => {
    try {
        // Extracting the unit ID from the request params
        const { id } = req.params  as unknown as UnitIdInput;

        // SQL query to fetch the unit by its ID
        const getUnitQuery = `
            SELECT unit_id, unit_name, unit_type, conversion_factor_to_base
            FROM units
            WHERE unit_id = $1;
        `;

        // Execute the query and pass the unit ID as the parameter
        const result = await pool.query(getUnitQuery, [id]);

        // If no unit found, return a 404 response
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Unit not found.' });
        }

        // Return the unit details as the response
        res.status(200).json({
            message: 'Unit found successfully.',
            unit: result.rows[0],
        });

    } catch (error: any) {
        console.error('Error fetching unit by ID:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch unit.' });
    }
});


router.put('/updateunit/:id', validateRequest({ params: unitIdSchema, body: unitUpdateSchema }), async (req: Request, res: Response) => {
    const { id } = req.params as unknown as UnitIdInput;
    type ExtendedUnitUpdateInput = unitUpdateInput & { [key: string]: any };

    const updateData = req.body as ExtendedUnitUpdateInput;
    const keys = Object.keys(updateData).filter(key => updateData[key] !== undefined);
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = keys.map(key => updateData[key as keyof unitUpdateInput]);

    if (keys.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    const sqlQuery = `
        UPDATE units
        SET ${setClause}
        WHERE unit_id = $${keys.length + 1}
        RETURNING *;
    `;

    try {
        const result = await pool.query(sqlQuery, [...values, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Unit not found.' });
        }

        res.status(200).json({
            message: 'Unit updated successfully.',
            unit: result.rows[0]
        });
    } catch (error: any) {
        console.error('Error updating unit:', error.message);
        res.status(500).json({ error: 'Server error. Failed to update unit.' });
    }
});


router.delete('/deleteunit/:id', validateRequest({ params: unitIdSchema }), async (req: Request, res: Response) => {
    const { id } = req.params as unknown as UnitIdInput;

    try {
        // SQL query to delete a unit by its ID
        const deleteUnitQuery = `
            DELETE FROM units
            WHERE unit_id = $1
            RETURNING unit_id, unit_name;
        `;

        // Execute the query to delete the unit
        const result = await pool.query(deleteUnitQuery, [id]);

        // If no unit was deleted (unit_id doesn't exist), return a 404 error
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Unit not found.' });
        }

        // Return a success message and the deleted unit details
        res.status(200).json({
            message: 'Unit deleted successfully.',
            deletedUnit: result.rows[0], // Send the deleted unit's information back to the client
        });
    } catch (error: any) {
        console.error('Error deleting unit:', error.message);
        res.status(500).json({ error: 'Server error. Failed to delete unit.' });
    }
});





export default router;

// routes/recipes.ts

import express, { Request, Response } from 'express';
import pool from '../../database'; // Adjust the path according to your project structure
import { validateRequest } from '../../middleware/validate';
import z from 'zod';
import {
    RecipeIdInput,
    recipeIdSchema,
    RecipeInput,
    recipeSchema,
    RecipeUpdateInput,
    recipeUpdateSchema,
    RecipeIngredientsInput,
    RecipeIngredientInput,
    RecipeIngredientUpdateInput,
    recipeIngredientsSchema,
    recipeIngredientUpdateSchema,
} from '../../schemas';
import { calculateCostPerUnit } from './recipeCost'; // Adjust the path accordingly
import { checkForCycles } from './recipeValidation'; // Adjust the path accordingly

const router = express.Router();

// GET /recipes - Get all recipes
router.get('/', async (req: Request, res: Response) => {
    try {
        const recipesQuery = 'SELECT * FROM recipes';
        const recipesResult = await pool.query(recipesQuery);

        res.status(200).json({
            message: 'Recipes fetched successfully.',
            recipes: recipesResult.rows,
        });
    } catch (error: any) {
        console.error('Error fetching recipes:', error.message);
        res.status(500).json({ error: 'Server error. Failed to fetch recipes.' });
    }
});

// GET /recipes/:id - Get a recipe by ID, including ingredients
router.get(
    '/:id',
    validateRequest({ params: recipeIdSchema }),
    async (req: Request, res: Response) => {
        const { id } = req.params;

        try {
            const recipeQuery = 'SELECT * FROM recipes WHERE recipe_id = $1';
            const recipeResult = await pool.query(recipeQuery, [id]);

            if (recipeResult.rows.length === 0) {
                return res.status(404).json({ error: 'Recipe not found.' });
            }

            const recipe = recipeResult.rows[0];

            // Get ingredients (including sub-recipes)
            const ingredientsQuery = `
        SELECT
          ri.*,
          p.product_name,
          sr.recipe_name AS sub_recipe_name,
          u.unit_name
        FROM recipe_ingredients ri
        LEFT JOIN products p ON ri.product_id = p.product_id
        LEFT JOIN recipes sr ON ri.sub_recipe_id = sr.recipe_id
        LEFT JOIN units u ON ri.unit_id = u.unit_id
        WHERE ri.recipe_id = $1;
      `;
            const ingredientsResult = await pool.query(ingredientsQuery, [id]);

            recipe.ingredients = ingredientsResult.rows;

            res.status(200).json({
                message: 'Recipe fetched successfully.',
                recipe,
            });
        } catch (error: any) {
            console.error('Error fetching recipe:', error.message);
            res.status(500).json({ error: 'Server error. Failed to fetch recipe.' });
        }
    }
);

// POST /recipes/addrecipe - Add a new recipe with ingredients
router.post(
    '/addrecipe',
    validateRequest({ body: recipeSchema }),
    async (req: Request, res: Response) => {
        const { recipe_name, instructions, yield: recipeYield, ingredients } =
            req.body as RecipeInput & { ingredients?: RecipeIngredientsInput };

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const insertRecipeQuery = `
        INSERT INTO recipes (recipe_name, instructions, yield)
        VALUES ($1, $2, $3)
        RETURNING *;
      `;
            const insertRecipeValues = [recipe_name.trim(), instructions || null, recipeYield || null];
            const insertRecipeResult = await client.query(insertRecipeQuery, insertRecipeValues);
            const recipe = insertRecipeResult.rows[0];

            if (ingredients && ingredients.length > 0) {
                // Check for cycles before inserting ingredients
                for (const ingredient of ingredients) {
                    if (ingredient.sub_recipe_id) {
                        const noCycle = await checkForCycles(recipe.recipe_id, ingredient.sub_recipe_id);
                        if (!noCycle) {
                            await client.query('ROLLBACK');
                            return res
                                .status(400)
                                .json({ error: 'Adding this sub-recipe would create a cycle.' });
                        }
                    }
                }

                const insertIngredientsQuery = `
          INSERT INTO recipe_ingredients
            (recipe_id, product_id, sub_recipe_id, quantity, unit_id, variant_id)
          VALUES
            ${ingredients
              .map(
                (_, idx) =>
                  `($1, $${idx * 5 + 2}, $${idx * 5 + 3}, $${idx * 5 + 4}, $${idx * 5 + 5}, $${
                    idx * 5 + 6
                  })`
              )
              .join(', ')}
          RETURNING *;
        `;
                const insertIngredientsValues = ingredients.flatMap((ingredient) => [
                    ingredient.product_id || null,
                    ingredient.sub_recipe_id || null,
                    ingredient.quantity,
                    ingredient.unit_id,
                    ingredient.variant_id || null,
                ]);
                // Add recipe_id at the beginning
                insertIngredientsValues.unshift(recipe.recipe_id);

                const insertIngredientsResult = await client.query(
                    insertIngredientsQuery,
                    insertIngredientsValues
                );

                recipe.ingredients = insertIngredientsResult.rows;
            }

            await client.query('COMMIT');

            res.status(201).json({
                message: 'Recipe added successfully.',
                recipe,
            });
        } catch (error: any) {
            await client.query('ROLLBACK');
            console.error('Error adding recipe:', error.message);
            res.status(500).json({ error: 'Server error. Failed to add recipe.' });
        } finally {
            client.release();
        }
    }
);

// PUT /recipes/updaterecipe/:id - Update a recipe's basic details
router.put(
    '/updaterecipe/:id',
    validateRequest({ params: recipeIdSchema, body: recipeUpdateSchema }),
    async (req: Request, res: Response) => {
        const parsedParams = recipeIdSchema.parse(req.params);

        const { id } = parsedParams;
        const { recipe_name, instructions, yield: recipeYield } = req.body as RecipeUpdateInput;

        try {
            const fields = [];
            const values = [];
            let idx = 1;

            if (recipe_name !== undefined) {
                fields.push(`recipe_name = $${idx++}`);
                values.push(recipe_name.trim());
            }
            if (instructions !== undefined) {
                fields.push(`instructions = $${idx++}`);
                values.push(instructions);
            }
            if (recipeYield !== undefined) {
                fields.push(`yield = $${idx++}`);
                values.push(recipeYield);
            }

            if (fields.length === 0) {
                return res.status(400).json({ error: 'No fields provided for update.' });
            }

            const updateQuery = `
        UPDATE recipes
        SET ${fields.join(', ')}
        WHERE recipe_id = $${idx}
        RETURNING *;
      `;
            values.push(id);

            const updateResult = await pool.query(updateQuery, values);

            if (updateResult.rows.length === 0) {
                return res.status(404).json({ error: 'Recipe not found or no update was made.' });
            }

            res.status(200).json({
                message: 'Recipe updated successfully.',
                recipe: updateResult.rows[0],
            });
        } catch (error: any) {
            console.error('Error updating recipe:', error.message);
            res.status(500).json({ error: 'Server error. Failed to update recipe.' });
        }
    }
);

// DELETE /recipes/deleterecipe/:id - Delete a recipe
router.delete(
    '/deleterecipe/:id',
    validateRequest({ params: recipeIdSchema }),
    async (req: Request, res: Response) => {
        const parsedParams = recipeIdSchema.parse(req.params);

        const { id } = parsedParams;

        try {
            const deleteQuery = `
        DELETE FROM recipes
        WHERE recipe_id = $1
        RETURNING *;
      `;
            const deleteResult = await pool.query(deleteQuery, [id]);

            if (deleteResult.rows.length === 0) {
                return res.status(404).json({ error: 'Recipe not found.' });
            }

            res.status(200).json({
                message: 'Recipe deleted successfully.',
                recipe: deleteResult.rows[0],
            });
        } catch (error: any) {
            console.error('Error deleting recipe:', error.message);
            res.status(500).json({ error: 'Server error. Failed to delete recipe.' });
        }
    }
);

// POST /recipes/:id/addingredients - Add ingredients to a recipe
router.post(
    '/:id/addingredients',
    validateRequest({ params: recipeIdSchema, body: recipeIngredientsSchema }),
    async (req: Request, res: Response) => {
        const parsedParams = recipeIdSchema.parse(req.params);

        const { id } = parsedParams;
        const ingredients = req.body as RecipeIngredientsInput;

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Check for cycles before inserting ingredients
            for (const ingredient of ingredients) {
                if (ingredient.sub_recipe_id) {
                    const noCycle = await checkForCycles(Number(id), ingredient.sub_recipe_id);
                    if (!noCycle) {
                        await client.query('ROLLBACK');
                        return res
                            .status(400)
                            .json({ error: 'Adding this sub-recipe would create a cycle.' });
                    }
                }
            }

            const insertIngredientsQuery = `
        INSERT INTO recipe_ingredients
          (recipe_id, product_id, sub_recipe_id, quantity, unit_id, variant_id)
        VALUES
          ${ingredients
                .map(
                    (_, idx) =>
                        `($1, $${idx * 5 + 2}, $${idx * 5 + 3}, $${idx * 5 + 4}, $${idx * 5 + 5}, $${
                            idx * 5 + 6
                        })`
                )
                .join(', ')}
        RETURNING *;
      `;
            const insertIngredientsValues = ingredients.flatMap((ingredient) => [
                ingredient.product_id || null,
                ingredient.sub_recipe_id || null,
                ingredient.quantity,
                ingredient.unit_id,
                ingredient.variant_id || null,
            ]);
            // Add recipe_id at the beginning
            insertIngredientsValues.unshift(id);

            const insertIngredientsResult = await client.query(
                insertIngredientsQuery,
                insertIngredientsValues
            );

            await client.query('COMMIT');

            res.status(201).json({
                message: 'Ingredients added successfully.',
                ingredients: insertIngredientsResult.rows,
            });
        } catch (error: any) {
            await client.query('ROLLBACK');
            console.error('Error adding ingredients:', error.message);
            res.status(500).json({ error: 'Server error. Failed to add ingredients.' });
        } finally {
            client.release();
        }
    }
);

// PUT /recipes/:id/updateingredient/:ingredientId - Update an ingredient in a recipe
router.put(
    '/:id/updateingredient/:ingredientId',
    validateRequest({
        params: recipeIdSchema.extend({ ingredientId: z.string().regex(/^\d+$/).transform(Number) }),
        body: recipeIngredientUpdateSchema,
    }),
    async (req: Request, res: Response) => {
        const { id, ingredientId } = req.params as { id: string; ingredientId: string };
        const updates = req.body as Partial<RecipeIngredientUpdateInput>;

        try {
            // Build dynamic SET clause
            const fields = [];
            const values = [];
            let idx = 1;

            if (updates.product_id !== undefined) {
                fields.push(`product_id = $${idx++}`);
                values.push(updates.product_id);
            }
            if (updates.sub_recipe_id !== undefined) {
                fields.push(`sub_recipe_id = $${idx++}`);
                values.push(updates.sub_recipe_id);
            }
            if (updates.quantity !== undefined) {
                fields.push(`quantity = $${idx++}`);
                values.push(updates.quantity);
            }
            if (updates.unit_id !== undefined) {
                fields.push(`unit_id = $${idx++}`);
                values.push(updates.unit_id);
            }
            if (updates.variant_id !== undefined) {
                fields.push(`variant_id = $${idx++}`);
                values.push(updates.variant_id);
            }

            if (fields.length === 0) {
                return res.status(400).json({ error: 'No fields provided for update.' });
            }

            // Ensure the validation logic for product_id and sub_recipe_id is enforced
            if (
                (updates.product_id !== undefined && updates.sub_recipe_id !== undefined) ||
                (updates.product_id === null && updates.sub_recipe_id === null)
            ) {
                return res.status(400).json({
                    error: 'Either product_id or sub_recipe_id must be provided, but not both.',
                });
            }

            // Check for cycles if sub_recipe_id is updated
            if (updates.sub_recipe_id !== undefined) {
                const noCycle = await checkForCycles(Number(id), updates.sub_recipe_id!);
                if (!noCycle) {
                    return res
                        .status(400)
                        .json({ error: 'Updating to this sub-recipe would create a cycle.' });
                }
            }

            const updateQuery = `
        UPDATE recipe_ingredients
        SET ${fields.join(', ')}
        WHERE recipe_ingredient_id = $${idx} AND recipe_id = $${idx + 1}
        RETURNING *;
      `;
            values.push(ingredientId, id);

            const updateResult = await pool.query(updateQuery, values);

            if (updateResult.rows.length === 0) {
                return res.status(404).json({ error: 'Ingredient not found or no update was made.' });
            }

            res.status(200).json({
                message: 'Ingredient updated successfully.',
                ingredient: updateResult.rows[0],
            });
        } catch (error: any) {
            console.error('Error updating ingredient:', error.message);
            res.status(500).json({ error: 'Server error. Failed to update ingredient.' });
        }
    }
);

// DELETE /recipes/:id/deleteingredient/:ingredientId - Delete an ingredient from a recipe
router.delete(
    '/:id/deleteingredient/:ingredientId',
    validateRequest({
        params: recipeIdSchema.extend({ ingredientId: z.string().regex(/^\d+$/).transform(Number) }),
    }),
    async (req: Request, res: Response) => {
        const { id, ingredientId } = req.params as { id: string; ingredientId: string };

        try {
            const deleteQuery = `
        DELETE FROM recipe_ingredients
        WHERE recipe_ingredient_id = $1 AND recipe_id = $2
        RETURNING *;
      `;
            const deleteResult = await pool.query(deleteQuery, [ingredientId, id]);

            if (deleteResult.rows.length === 0) {
                return res.status(404).json({ error: 'Ingredient not found.' });
            }

            res.status(200).json({
                message: 'Ingredient deleted successfully.',
                ingredient: deleteResult.rows[0],
            });
        } catch (error: any) {
            console.error('Error deleting ingredient:', error.message);
            res.status(500).json({ error: 'Server error. Failed to delete ingredient.' });
        }
    }
);

// GET /recipes/:id/cost-per-unit - Calculate cost per unit of a recipe
router.get(
    '/:id/cost-per-unit',
    validateRequest({ params: recipeIdSchema }),
    async (req: Request, res: Response) => {
        const parsedParams = recipeIdSchema.parse(req.params);

        const { id } = parsedParams;

        try {
            const costPerUnit = await calculateCostPerUnit(id);
            res.status(200).json({
                message: 'Cost per unit calculated successfully.',
                cost_per_unit: costPerUnit,
            });
        } catch (error: any) {
            console.error('Error calculating cost per unit:', error.message);
            res.status(500).json({ error: 'Server error. Failed to calculate cost per unit.' });
        }
    }
);

export default router;

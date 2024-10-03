// services/recipeCost.ts

import pool from '../../database'; // Adjust the path based on your project structure

async function getProductPrice(variantId: number): Promise<number> {
    const query = `
    SELECT price
    FROM product_prices
    WHERE variant_id = $1
    ORDER BY price_date DESC
    LIMIT 1;
  `;
    const result = await pool.query(query, [variantId]);
    if (result.rows.length === 0) {
        throw new Error(`Price not found for variant ID: ${variantId}`);
    }
    return parseFloat(result.rows[0].price);
}

async function getUnitConversionFactor(unitId: number): Promise<number> {
    const query = `SELECT conversion_factor_to_base FROM units WHERE unit_id = $1;`;
    const result = await pool.query(query, [unitId]);
    if (result.rows.length === 0) {
        throw new Error(`Unit not found with ID: ${unitId}`);
    }
    return parseFloat(result.rows[0].conversion_factor_to_base);
}

async function getRecipeYield(recipeId: number): Promise<number> {
    const query = `SELECT yield FROM recipes WHERE recipe_id = $1;`;
    const result = await pool.query(query, [recipeId]);
    if (result.rows.length === 0) {
        throw new Error(`Recipe not found with ID: ${recipeId}`);
    }
    const recipeYield = result.rows[0].yield;
    if (!recipeYield || recipeYield <= 0) {
        throw new Error(`Invalid yield for recipe ID: ${recipeId}`);
    }
    return recipeYield;
}

async function getIngredientsForRecipe(recipeId: number): Promise<any[]> {
    const query = `
    SELECT
      ri.*,
      pv.variant_id
    FROM recipe_ingredients ri
    LEFT JOIN product_variants pv ON ri.variant_id = pv.variant_id
    WHERE ri.recipe_id = $1;
  `;
    const result = await pool.query(query, [recipeId]);
    return result.rows;
}

export async function calculateRecipeCost(recipeId: number): Promise<number> {
    let totalCost = 0;

    const ingredients = await getIngredientsForRecipe(recipeId);
    const recipeYield = await getRecipeYield(recipeId);

    for (const ingredient of ingredients) {
        const quantity = parseFloat(ingredient.quantity);

        const unitConversionFactor = await getUnitConversionFactor(ingredient.unit_id);
        const quantityInBaseUnit = quantity * unitConversionFactor;

        if (ingredient.product_id) {
            // Fetch the latest price for the product variant
            const pricePerUnit = await getProductPrice(
                ingredient.variant_id || ingredient.product_id
            );
            totalCost += pricePerUnit * quantityInBaseUnit;
        } else if (ingredient.sub_recipe_id) {
            // Recursively calculate the cost of the sub-recipe
            const subRecipeCost = await calculateRecipeCost(ingredient.sub_recipe_id);
            const subRecipeYield = await getRecipeYield(ingredient.sub_recipe_id);

            // Adjust cost based on how much of the sub-recipe is used
            const scalingFactor = quantityInBaseUnit / subRecipeYield;
            totalCost += subRecipeCost * scalingFactor;
        }
    }

    return totalCost;
}

export async function calculateCostPerUnit(recipeId: number): Promise<number> {
    const totalCost = await calculateRecipeCost(recipeId);
    const recipeYield = await getRecipeYield(recipeId);

    if (recipeYield <= 0) {
        throw new Error('Recipe yield must be greater than zero.');
    }

    const costPerUnit = totalCost / recipeYield;
    return costPerUnit;
}

// services/recipeValidation.ts

import pool from '../../database'; // Adjust the path accordingly

export async function checkForCycles(
    recipeId: number,
    subRecipeId: number
): Promise<boolean> {
    const visited = new Set<number>();

    async function visit(id: number): Promise<boolean> {
        if (visited.has(id)) {
            return false; // Cycle detected
        }
        visited.add(id);

        const query = `
      SELECT sub_recipe_id
      FROM recipe_ingredients
      WHERE recipe_id = $1 AND sub_recipe_id IS NOT NULL;
    `;
        const result = await pool.query(query, [id]);

        for (const row of result.rows) {
            if (row.sub_recipe_id === recipeId) {
                return false; // Cycle detected
            }
            const noCycle = await visit(row.sub_recipe_id);
            if (!noCycle) {
                return false; // Cycle detected down the chain
            }
        }
        return true;
    }

    return await visit(subRecipeId);
}

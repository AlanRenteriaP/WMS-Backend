// schemas.ts

import { z } from 'zod';

// Base schema without .refine()
const baseRecipeIngredientSchema = z.object({
    product_id: z.number().int().positive().optional(),
    sub_recipe_id: z.number().int().positive().optional(),
    quantity: z.number().positive({ message: 'Quantity must be a positive number.' }),
    unit_id: z.number().int().positive({ message: 'Unit ID must be a positive integer.' }),
    variant_id: z.number().int().positive().optional(),
});

// Full schema with .refine()
export const recipeIngredientSchema = baseRecipeIngredientSchema.refine(
    (data) => (data.product_id && !data.sub_recipe_id) || (!data.product_id && data.sub_recipe_id),
    {
        message: 'Either product_id or sub_recipe_id must be provided, but not both.',
        path: ['product_id', 'sub_recipe_id'],
    }
);

// Partial schema for updates
export const recipeIngredientUpdateSchema = baseRecipeIngredientSchema.partial().refine(
    (data) => {
        if (data.product_id !== undefined || data.sub_recipe_id !== undefined) {
            return (data.product_id && !data.sub_recipe_id) || (!data.product_id && data.sub_recipe_id);
        }
        return true;
    },
    {
        message: 'Either product_id or sub_recipe_id must be provided, but not both.',
        path: ['product_id', 'sub_recipe_id'],
    }
);

// Ingredient array schemas
export const recipeIngredientsSchema = z.array(recipeIngredientSchema);
export const recipeIngredientsUpdateSchema = z.array(recipeIngredientUpdateSchema);

// TypeScript types
export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>;
export type RecipeIngredientUpdateInput = z.infer<typeof recipeIngredientUpdateSchema>;
export type RecipeIngredientsInput = z.infer<typeof recipeIngredientsSchema>;
export type RecipeIngredientsUpdateInput = z.infer<typeof recipeIngredientsUpdateSchema>;

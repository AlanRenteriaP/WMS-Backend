import { z } from 'zod';

// Recipe ID Schema
export const recipeIdSchema = z.object({
    id: z
        .string()
        .regex(/^\d+$/, { message: 'ID must be a valid number.' })
        .transform(Number),
});

// Recipe Schema for creation and updates
export const recipeSchema = z.object({
    recipe_name: z
        .string()
        .min(1, { message: 'Recipe name is required.' })
        .max(200, { message: 'Recipe name must not exceed 200 characters.' }),
    instructions: z.string().optional(),
    yield: z
        .number()
        .int({ message: 'Yield must be an integer.' })
        .positive({ message: 'Yield must be a positive number.' })
        .optional(),
    ingredients: z.array(z.any()).optional(), // We'll define the ingredients schema next
});

// Recipe Update Schema (partial updates)
export const recipeUpdateSchema = recipeSchema.partial();

// TypeScript types
export type RecipeIdInput = z.infer<typeof recipeIdSchema>;
export type RecipeInput = z.infer<typeof recipeSchema>;
export type RecipeUpdateInput = z.infer<typeof recipeUpdateSchema>;

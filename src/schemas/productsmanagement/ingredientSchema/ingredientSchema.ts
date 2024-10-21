import { z } from 'zod';

// Schema for validating product ID in routes
export const ingredientIdSchema = z.object({
    id: z
        .string()
        .regex(/^\d+$/, { message: 'ID must be a valid number.' })
        .transform(Number),
});

// Schema for creating or updating a product (full updates)
export const ingredientSchema = z.object({
    ingredient_name: z.string()
        .min(1, { message: "Ingredient name is required" })
        .max(100, { message: "Ingredient name must not exceed 100 characters" }),
    default_unit_id: z.number()
        .int({ message: "Default unit ID must be an integer" }),
    default_product_id: z.number()
        .int({ message: "Default product ID must be an integer" })
        .optional(),
});


// TypeScript types inferred from schemas
export type ingredientIdInput = z.infer<typeof ingredientIdSchema>;
export type ingredientInput = z.infer<typeof ingredientSchema>;

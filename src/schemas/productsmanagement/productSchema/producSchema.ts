import { z } from 'zod';

// Schema for validating product ID in routes
export const productIdSchema = z.object({
    id: z
        .string()
        .regex(/^\d+$/, { message: 'ID must be a valid number.' })
        .transform(Number),
});

// Schema for creating or updating a product (full updates)
export const productSchema = z.object({
    product_name: z.string()
        .min(1, { message: "Product name is required" })
        .max(100, { message: "Product name must not exceed 100 characters" }),
    default_unit_id: z.number()
        .int({ message: "Default unit ID must be an integer" }),
    category: z.string()
        .max(100, { message: "Category must not exceed 100 characters" })
        .optional(),
    default_variant_id: z.number()
        .int({ message: "Default variant ID must be an integer" })
        .optional()
});

// Schema for partial updates (reuse the full schema with .partial())
export const productUpdateSchema = productSchema.partial();

// TypeScript types inferred from schemas
export type ProductIdInput = z.infer<typeof productIdSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

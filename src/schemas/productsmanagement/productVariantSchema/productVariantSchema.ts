import { z } from 'zod';

export const productVariantSchema = z.object({
    store_product_id: z.number({
        required_error: 'Store product ID is required',
        invalid_type_error: 'Store product ID must be a number'
    }),
    brand_id: z.number({
        required_error: 'Brand ID is required',
        invalid_type_error: 'Brand ID must be a number'
    }),
    package_size: z.number({
        required_error: 'Package size is required',
        invalid_type_error: 'Package size must be a number'
    }).positive({
        message: 'Package size must be positive'
    }),
    unit_id: z.number({
        required_error: 'Unit ID is required',
        invalid_type_error: 'Unit ID must be a number'
    }),
    upc: z.string().max(20, {
        message: 'UPC must be at most 20 characters long'
    }).optional(),
    attributes: z.any().optional() // Can use z.record(z.any()), or z.object({...}) if the attributes have a specific structure
});
// Schema for validating product ID in routes
export const productVariantIdSchema = z.object({
    id: z
        .string()
        .regex(/^\d+$/, { message: 'ID must be a valid number.' })
        .transform(Number),
});

// Schema for partial updates (reuse the full schema with .partial())
export const productVariantUpdateSchema = productVariantSchema.partial();

export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type ProductVariantIdInput = z.infer<typeof productVariantIdSchema>;
export type ProductVariantUpdateInput = z.infer<typeof productVariantUpdateSchema>;


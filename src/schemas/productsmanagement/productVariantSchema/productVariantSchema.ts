import { z } from 'zod';

export const productVariantSchema = z.object({
    product_id: z.number({
        required_error: 'Product ID is required',
        invalid_type_error: 'Product ID must be a number'
    }).int({
        message: 'Product ID must be an integer'
    }),
    supplier_id: z.number({
        required_error: 'Supplier ID is required',
        invalid_type_error: 'Supplier ID must be a number'
    }).int({
        message: 'Supplier ID must be an integer'
    }),
    brand_id: z.number({
        required_error: 'Brand ID is required',
        invalid_type_error: 'Brand ID must be a number'
    }).int({
        message: 'Brand ID must be an integer'
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
    }).int({
        message: 'Unit ID must be an integer'
    }),
    price: z.number({
        required_error: 'Price is required',
        invalid_type_error: 'Price must be a number'
    }).positive({
        message: 'Price must be a positive number'
    }),
});


export const productVariantIdSchema = z.object({
    id: z
        .string()
        .regex(/^\d+$/, { message: 'ID must be a valid number.' })
        .transform(Number),  // Ensures ID is transformed into a number
});

// Schema for partial updates (reuse the full schema with .partial())
export const productVariantUpdateSchema = productVariantSchema.partial();

export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type ProductVariantIdInput = z.infer<typeof productVariantIdSchema>;
export type ProductVariantUpdateInput = z.infer<typeof productVariantUpdateSchema>;

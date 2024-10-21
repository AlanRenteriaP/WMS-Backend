import { z } from 'zod';

export const addProductSchema = z.object({
    brand_id: z.number({
        required_error: 'Brand ID is required',
        invalid_type_error: 'Brand ID must be a number',
    }).int({
        message: 'Brand ID must be an integer',
    }),

    package_size: z.number({
        required_error: 'Package size is required',
        invalid_type_error: 'Package size must be a number',
    }).positive({
        message: 'Package size must be positive',
    }),

    unit_id: z.number({
        required_error: 'Unit ID is required',
        invalid_type_error: 'Unit ID must be a number',
    }).int({
        message: 'Unit ID must be an integer',
    }),

    ingredient_id: z.number({
        invalid_type_error: 'Ingredient ID must be a number',
    }).int({
        message: 'Ingredient ID must be an integer',
    }).optional(),

    default_supplier_product_id: z.number({
        invalid_type_error: 'Default Supplier Product ID must be a number',
    }).int({
        message: 'Default Supplier Product ID must be an integer',
    }).optional(),
});

export type AddProductInput = z.infer<typeof addProductSchema>;

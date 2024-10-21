// src/schemas/supplierSchema.ts
import { z } from 'zod';

export const supplierSchema = z.object({
    supplier_name: z
        .string()
        .min(1, { message: 'Store name cannot be empty.' })
        .max(100, { message: 'Store name must be at most 100 characters.' }),
    location: z
        .string()
        .max(200, { message: 'Location must be at most 200 characters.' })
        .optional()
        .nullable(),
});

export type StoreInput = z.infer<typeof supplierSchema>;

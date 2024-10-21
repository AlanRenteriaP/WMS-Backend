// src/schemas/supplierIdSchema.ts
import { z } from 'zod';

/**
 * Zod schema for validating the 'id' URL parameter.
 */
export const supplierIdSchema = z.object({
    id: z
        .string()
        .regex(/^\d+$/, { message: 'ID must be a valid number.' })
        .transform(Number),
});

/**
 * TypeScript type inferred from the supplierIdSchema.
 */
export type StoreIdInput = z.infer<typeof supplierIdSchema>;

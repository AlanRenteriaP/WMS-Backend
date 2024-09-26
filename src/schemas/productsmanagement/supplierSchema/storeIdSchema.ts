// src/schemas/storeIdSchema.ts
import { z } from 'zod';

/**
 * Zod schema for validating the 'id' URL parameter.
 */
export const storeIdSchema = z.object({
    id: z
        .string()
        .regex(/^\d+$/, { message: 'ID must be a valid number.' })
        .transform(Number),
});

/**
 * TypeScript type inferred from the storeIdSchema.
 */
export type StoreIdInput = z.infer<typeof storeIdSchema>;

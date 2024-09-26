// src/schemas/brandSchema.ts
import { z } from 'zod';


export const brandSchema = z.object({
    brand_name: z.string().min(1, { message: 'Brand name cannot be empty.' }).max(100, { message: 'Brand name must be at most 100 characters.' }),
});

export const brandIdSchema = z.object({
    id: z
        .string()
        .regex(/^\d+$/, { message: 'ID must be a valid number.' })
        .transform(Number),
});


export type BrandIdInput = z.infer<typeof brandIdSchema>;
export type BrandInput = z.infer<typeof brandSchema>;

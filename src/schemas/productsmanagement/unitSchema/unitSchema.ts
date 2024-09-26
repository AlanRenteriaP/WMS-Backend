import { z } from 'zod';

// Helper function to validate precision
const precisionValidator = (value: number, precision: number) => {
    const strValue = value.toString();
    const decimalPart = strValue.split('.')[1];
    return !decimalPart || decimalPart.length <= precision;
};

export const unitSchema = z.object({
    unit_name: z.string()
        .min(1, { message: 'Unit name cannot be empty' })
        .max(50, { message: 'Unit name must be at most 50 characters' }),

    unit_type: z.string()
        .min(1, { message: 'Unit type cannot be empty' })
        .max(20, { message: 'Unit type must be at most 20 characters' }),

    conversion_factor_to_base: z.number()
        .refine(val => precisionValidator(val, 18), {
            message: 'Conversion factor must have at most 18 decimal places',
        })
});

export const unitIdSchema = z.object({
    id: z
        .string()
        .regex(/^\d+$/, { message: 'ID must be a valid number.' })
        .transform(Number),
});

export const unitUpdateSchema = unitSchema.partial();


export type UnitInput = z.infer<typeof unitSchema>;
export type UnitIdInput = z.infer<typeof unitIdSchema>;
export type unitUpdateInput = z.infer<typeof unitUpdateSchema>;
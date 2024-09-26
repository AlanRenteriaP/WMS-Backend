// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Interface to define which parts of the request to validate.
 */
interface ValidationSchemas {
    body?: ZodSchema<any>;
    query?: ZodSchema<any>;
    params?: ZodSchema<any>;
}

/**
 * Generic middleware to validate request parts against Zod schemas.
 * @param schemas - Object containing schemas for different parts of the request.
 * @returns Express middleware function.
 */
export const validateRequest = (schemas: ValidationSchemas) => (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (schemas.body) {
            const bodyResult = schemas.body.safeParse(req.body);
            if (!bodyResult.success) {
                const errors = bodyResult.error.errors.map(err => err.message).join(', ');
                return res.status(400).json({ error: errors });
            }
            req.body = bodyResult.data;
        }

        if (schemas.query) {
            const queryResult = schemas.query.safeParse(req.query);
            if (!queryResult.success) {
                const errors = queryResult.error.errors.map(err => err.message).join(', ');
                return res.status(400).json({ error: errors });
            }
            req.query = queryResult.data;
        }

        if (schemas.params) {
            const paramsResult = schemas.params.safeParse(req.params);
            if (!paramsResult.success) {
                const errors = paramsResult.error.errors.map(err => err.message).join(', ');
                return res.status(400).json({ error: errors });
            }
            req.params = paramsResult.data;
        }

        next();
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({ error: 'Server error during validation.' });
    }
};

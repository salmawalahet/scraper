import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { HTTP_STATUS } from '@leadx/shared';

/**
 * Zod validation middleware factory
 * Validates request body against a Zod schema
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
          success: false,
          error: 'Validation failed',
          errors,
        });
        return;
      }

      next(error);
    }
  };
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
          success: false,
          error: 'Query validation failed',
          errors,
        });
        return;
      }

      next(error);
    }
  };
}

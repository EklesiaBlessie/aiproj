import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';

/**
 * Global Express error handler.
 * Catches Zod validation errors, Mongoose errors, and generic errors.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ── Zod validation error ──
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // ── Mongoose validation error ──
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      path: e.path,
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      error: 'Database validation failed',
      details,
    });
    return;
  }

  // ── Mongoose cast error (e.g. invalid ObjectId) ──
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      error: `Invalid value for ${err.path}: ${err.value}`,
    });
    return;
  }

  // ── MongoDB duplicate key ──
  if ((err as any).code === 11000) {
    res.status(409).json({
      success: false,
      error: 'Duplicate key error',
      details: (err as any).keyValue,
    });
    return;
  }

  // ── Generic / unexpected error ──
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}

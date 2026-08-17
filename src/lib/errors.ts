import { NextResponse } from 'next/server';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 400, code: string = 'BAD_REQUEST', details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function handleApiError(error: any) {
  // SECURITY: Log full error server-side but never expose internal details to clients (FIX HIGH-07)
  console.error('[API_ERROR]', error instanceof Error ? error.message : error);

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: error.code,
        message: error.message,
        // SECURITY: Only include details in non-production
        ...(process.env.NODE_ENV !== 'production' ? { details: error.details } : {}),
      },
      { status: error.statusCode }
    );
  }

  // SECURITY: Never expose raw error.message from DB/library errors to clients
  return NextResponse.json(
    {
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    },
    { status: 500 }
  );
}

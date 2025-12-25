import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';
import { Error as MongooseError } from 'mongoose';
import { ErrorResponse, ValidationError } from '../interfaces/error-response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);
    
    // Log the error
    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception,
    );

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;

    // Handle HTTP exceptions (NestJS built-in)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      let message: string | string[];
      let validationErrors: ValidationError[] | undefined;

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        
        // Handle validation errors
        if (Array.isArray(responseObj.message)) {
          validationErrors = this.parseValidationErrors(responseObj.message);
        }
      } else {
        message = exceptionResponse as string;
      }

      return {
        statusCode: status,
        message,
        error: exception.constructor.name,
        timestamp,
        path,
        validationErrors,
      };
    }

    // Handle MongoDB duplicate key errors
    if (this.isMongoError(exception) && exception.code === 11000) {
      const field = this.extractDuplicateField(exception);
      return {
        statusCode: HttpStatus.CONFLICT,
        message: `Duplicate value for field: ${field}`,
        error: 'ConflictException',
        timestamp,
        path,
        details: {
          field,
          code: exception.code,
        },
      };
    }

    // Handle Mongoose validation errors
    if (exception instanceof MongooseError.ValidationError) {
      const validationErrors: ValidationError[] = Object.keys(exception.errors).map(
        (field) => ({
          field,
          value: exception.errors[field].value,
          constraints: [exception.errors[field].message],
        }),
      );

      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        error: 'ValidationException',
        timestamp,
        path,
        validationErrors,
      };
    }

    // Handle Mongoose cast errors (invalid ObjectId, etc.)
    if (exception instanceof MongooseError.CastError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Invalid ${exception.kind}: ${exception.value}`,
        error: 'CastException',
        timestamp,
        path,
        details: {
          field: exception.path,
          value: exception.value,
          kind: exception.kind,
        },
      };
    }

    // Handle generic MongoDB errors
    if (this.isMongoError(exception)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database operation failed',
        error: 'DatabaseException',
        timestamp,
        path,
        details: {
          code: exception.code,
          name: exception.name,
        },
      };
    }

    // Handle generic errors
    const message = exception instanceof Error ? exception.message : 'Internal server error';
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      error: 'InternalServerErrorException',
      timestamp,
      path,
    };
  }

  private isMongoError(exception: unknown): exception is MongoError {
    return exception instanceof MongoError || (exception as any)?.name === 'MongoError';
  }

  private extractDuplicateField(error: MongoError): string {
    const match = error.message.match(/index: (.+?)_/);
    return match ? match[1] : 'unknown';
  }

  private parseValidationErrors(messages: string[]): ValidationError[] {
    return messages.map((message) => {
      // Try to parse class-validator error format
      const match = message.match(/^(.+?) (.+)$/);
      if (match) {
        return {
          field: match[1],
          value: undefined,
          constraints: [match[2]],
        };
      }
      
      return {
        field: 'unknown',
        value: undefined,
        constraints: [message],
      };
    });
  }
}
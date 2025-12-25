import { HttpException, HttpStatus } from '@nestjs/common';

export class AdminAccessRequiredException extends HttpException {
  constructor(resource?: string) {
    const message = resource 
      ? `Admin access required to access ${resource}` 
      : 'Admin access required';
    super(message, HttpStatus.FORBIDDEN);
  }
}

export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, id: string) {
    super(`${resource} with ID ${id} not found`, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateResourceException extends HttpException {
  constructor(resource: string, field: string, value: string) {
    super(`${resource} with ${field} '${value}' already exists`, HttpStatus.CONFLICT);
  }
}

export class InvalidOperationException extends HttpException {
  constructor(operation: string, reason: string) {
    super(`Cannot ${operation}: ${reason}`, HttpStatus.BAD_REQUEST);
  }
}

export class ValidationException extends HttpException {
  constructor(errors: { field: string; message: string }[]) {
    const message = errors.map(e => `${e.field}: ${e.message}`).join(', ');
    super(`Validation failed: ${message}`, HttpStatus.BAD_REQUEST);
  }
}
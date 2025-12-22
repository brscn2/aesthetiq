export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  details?: any;
  validationErrors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  value: any;
  constraints: string[];
}
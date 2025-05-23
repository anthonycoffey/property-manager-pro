export interface AppError {
  message: string;
  code?: string; // Firebase errors often have a 'code' property
}

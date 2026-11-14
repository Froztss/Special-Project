export * from './schemas.js';

export interface HealthResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  message: string;
  timestamp: string;
}

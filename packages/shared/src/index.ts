import { z } from 'zod';

export const userRoleSchema = z.enum(['caregiver', 'ot', 'sped_teacher']);
export const childDelayDomainSchema = z.enum(['speech', 'motor', 'cognitive', 'social', 'general']);
export const activityCategorySchema = z.enum(['hygiene', 'food', 'school', 'play', 'other']);
export const pictureCardCategorySchema = z.enum(['Food', 'Emotions', 'Activities', 'Needs']);
export const positiveIdSchema = z.coerce.number().int().positive();

export type UserRole = z.infer<typeof userRoleSchema>;
export type ChildDelayDomain = z.infer<typeof childDelayDomainSchema>;
export type ActivityCategory = z.infer<typeof activityCategorySchema>;
export type PictureCardCategory = z.infer<typeof pictureCardCategorySchema>;

export interface HealthResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  message: string;
  timestamp: string;
}

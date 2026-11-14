import { z } from 'zod';

export const userRoleSchema = z.enum(['caregiver', 'ot', 'sped_teacher']);
export const childDelayDomainSchema = z.enum(['speech', 'motor', 'cognitive', 'social', 'general']);
export const activityCategorySchema = z.enum(['hygiene', 'food', 'school', 'play', 'other']);
export const pictureCardCategorySchema = z.enum(['Food', 'Emotions', 'Activities', 'Needs']);
export const positiveIdSchema = z.coerce.number().int().positive();

export const PREDEFINED_AVATARS = ['🦊', '🐼', '🐰', '🐻', '🐱', '🐶'] as const;

const childProfileFields = z.strictObject({
  name: z.string().trim().min(1).max(100),
  age: z.number().int().min(0).max(120),
  delay_domain: childDelayDomainSchema,
  notes: z.string().trim().max(2000).nullable().optional(),
  avatar: z.enum(PREDEFINED_AVATARS),
});

export const createChildSchema = childProfileFields.extend({
  avatar: childProfileFields.shape.avatar.default(PREDEFINED_AVATARS[0]),
});

export const updateChildSchema = childProfileFields.partial().refine(
  (value) => Object.values(value).some((field) => field !== undefined),
  'Provide at least one of name, age, delay_domain, notes, avatar',
);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'date must be a valid calendar date');

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'start_time must be in HH:MM 24-hour format');

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const scheduleQuerySchema = z.object({
  childId: z.coerce.number().int().positive(),
  date: isoDate,
});

export const createScheduleSchema = z.object({
  childId: z.number().int().positive(),
  date: isoDate,
  copyFrom: isoDate.optional(),
});

export const updateScheduleSchema = z.object({
  date: isoDate,
});

export const createTaskSchema = z
  .object({
    scheduleId: z.number().int().positive(),
    activityId: z.number().int().positive().optional(),
    name: z.string().trim().min(1).max(100).optional(),
    icon: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const hasActivity = value.activityId !== undefined;
    const hasCustom = value.name !== undefined || value.icon !== undefined;
    if (hasActivity && hasCustom) {
      ctx.addIssue({ code: 'custom', message: 'Provide either activityId or name + icon, not both' });
    }
    if (!hasActivity && !(value.name !== undefined && value.icon !== undefined)) {
      ctx.addIssue({ code: 'custom', message: 'Provide activityId, or both name and icon' });
    }
  });

export const updateTaskSchema = z
  .object({
    start_time: hhmm.nullable().optional(),
    duration_min: z.number().int().min(1).max(1440).nullable().optional(),
    position: z.number().int().min(1).optional(),
  })
  .refine(
    (value) =>
      value.start_time !== undefined || value.duration_min !== undefined || value.position !== undefined,
    'Provide at least one of start_time, duration_min, position',
  );

export const completeTaskSchema = z.object({
  done: z.boolean(),
});

export const cardQuerySchema = z.object({
  childId: z.coerce.number().int().positive(),
  includeHidden: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
});

export const createCardSchema = z.strictObject({
  childId: z.number().int().positive(),
  label: z.string().trim().min(1).max(100),
  category: pictureCardCategorySchema,
  icon: z.string().min(1),
});

export const updateCardVisibilitySchema = z.strictObject({
  hidden: z.boolean(),
});

export const progressQuerySchema = z.object({
  range: z.enum(['7d']).default('7d'),
});

export const updateSettingsSchema = z.strictObject({
  font_size: z.enum(['small', 'medium', 'large']),
  contrast: z.enum(['normal', 'high']),
  sound_on: z.boolean(),
});

export const updateProfileSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type ChildDelayDomain = z.infer<typeof childDelayDomainSchema>;
export type ActivityCategory = z.infer<typeof activityCategorySchema>;
export type PictureCardCategory = z.infer<typeof pictureCardCategorySchema>;

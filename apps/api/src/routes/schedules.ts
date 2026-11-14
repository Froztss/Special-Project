import { Router, type Request } from 'express';
import { asyncHandler, HttpError } from '../lib/errors.js';
import { parse } from '../lib/validate.js';
import { currentUser } from '../middleware/requireAuth.js';
import * as data from '../mocks/data.js';
import {
  createScheduleSchema,
  idParamSchema,
  scheduleQuerySchema,
  updateScheduleSchema,
} from '@starter/shared';

export const schedulesRouter = Router();

function serializeSchedule(schedule: data.Schedule) {
  return { ...schedule, tasks: data.tasksForSchedule(schedule.id) };
}

function ownedSchedule(req: Request, id: number): data.Schedule {
  const schedule = data.findScheduleForUser(id, currentUser(req).id);
  if (!schedule) {
    throw new HttpError(404, 'Schedule not found');
  }
  return schedule;
}

schedulesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { childId, date } = parse(scheduleQuerySchema, req.query);
    if (!data.findChildForUser(childId, currentUser(req).id)) {
      throw new HttpError(404, 'Child not found');
    }
    const schedule = data.findScheduleByChildAndDate(childId, date);
    if (!schedule) {
      throw new HttpError(404, 'Schedule not found');
    }
    res.json(serializeSchedule(schedule));
  }),
);

schedulesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { childId, date, copyFrom } = parse(createScheduleSchema, req.body);
    if (!data.findChildForUser(childId, currentUser(req).id)) {
      throw new HttpError(404, 'Child not found');
    }
    if (data.findScheduleByChildAndDate(childId, date)) {
      throw new HttpError(409, 'A schedule already exists for this child and date');
    }
    let source: data.Schedule | undefined;
    if (copyFrom !== undefined) {
      source = data.findScheduleByChildAndDate(childId, copyFrom);
      if (!source) {
        throw new HttpError(404, 'No schedule found to copy from');
      }
    }
    const schedule = data.createSchedule(childId, date);
    if (source) {
      data.copyTasks(source.id, schedule.id);
    }
    res.status(201).json(serializeSchedule(schedule));
  }),
);

schedulesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    const { date } = parse(updateScheduleSchema, req.body);
    const schedule = ownedSchedule(req, id);
    if (
      date !== schedule.schedule_date &&
      data.findScheduleByChildAndDate(schedule.child_id, date)
    ) {
      throw new HttpError(409, 'A schedule already exists for this child and date');
    }
    data.setScheduleDate(schedule, date);
    res.json(serializeSchedule(schedule));
  }),
);

schedulesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    const schedule = ownedSchedule(req, id);
    data.deleteSchedule(schedule.id);
    res.json({ success: true });
  }),
);
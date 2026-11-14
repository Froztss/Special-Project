import { Router, type Request } from 'express';
import { asyncHandler, HttpError } from '../lib/errors.js';
import { parse } from '../lib/validate.js';
import { currentUser, requireAuth } from '../mocks/auth.js';
import * as data from '../mocks/data.js';
import {
  completeTaskSchema,
  createTaskSchema,
  idParamSchema,
  updateTaskSchema,
} from '../schemas.js';

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

function ownedTask(req: Request, id: number): data.Task {
  const task = data.findTaskForUser(id, currentUser(req).id);
  if (!task) {
    throw new HttpError(404, 'Task not found');
  }
  return task;
}

tasksRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = parse(createTaskSchema, req.body);
    const schedule = data.findScheduleForUser(body.scheduleId, currentUser(req).id);
    if (!schedule) {
      throw new HttpError(404, 'Schedule not found');
    }
    let task: data.Task;
    if (body.activityId !== undefined) {
      const activity = data.findActivity(body.activityId);
      if (!activity) {
        throw new HttpError(400, 'Unknown activity');
      }
      task = data.addTask(schedule.id, {
        activity_id: activity.id,
        name: activity.name,
        icon: activity.icon,
      });
    } else {
      if (!data.isPredefinedIcon(body.icon!)) {
        throw new HttpError(400, 'icon must be one of the predefined icons');
      }
      task = data.addTask(schedule.id, {
        activity_id: null,
        name: body.name!,
        icon: body.icon!,
      });
    }
    res.status(201).json(task);
  }),
);

tasksRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    const patch = parse(updateTaskSchema, req.body);
    const task = ownedTask(req, id);
    if (patch.position !== undefined) {
      const count = data.tasksForSchedule(task.schedule_id).length;
      if (patch.position > count) {
        throw new HttpError(400, `position must be between 1 and ${count}`);
      }
    }
    data.applyTaskUpdate(task, patch);
    res.json(task);
  }),
);

tasksRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    const task = ownedTask(req, id);
    data.removeTask(task);
    res.json({ success: true });
  }),
);

tasksRouter.patch(
  '/:id/complete',
  asyncHandler(async (req, res) => {
    const { id } = parse(idParamSchema, req.params);
    const { done } = parse(completeTaskSchema, req.body);
    const task = ownedTask(req, id);
    data.setTaskCompletion(task, done);
    res.json(task);
  }),
);
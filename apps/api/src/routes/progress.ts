import { Router } from 'express';
import type { UserRepository } from '../users/userRepository.js';
import { asyncHandler, HttpError } from '../lib/errors.js';
import { parse } from '../lib/validate.js';
import { currentUser, requireAuth } from '../middleware/requireAuth.js';
import * as data from '../mocks/data.js';
import { idParamSchema, progressQuerySchema } from '@starter/shared';

export function progressRouter(users: UserRepository): Router {
  const router = Router();
  router.use(requireAuth(users));

  function dateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  router.get(
    '/:childId',
    asyncHandler(async (req, res) => {
      const { id: childId } = parse(idParamSchema, { id: req.params.childId });
      const { range } = parse(progressQuerySchema, req.query);
      if (!data.findChildForUser(childId, currentUser(req).id)) {
        throw new HttpError(404, 'Child not found');
      }

      const todayDate = dateString(new Date());
      const firstDate = new Date(`${todayDate}T00:00:00.000Z`);
      firstDate.setUTCDate(firstDate.getUTCDate() - 6);
      const days = Array.from({ length: 7 }, (_, index) => {
        const current = new Date(firstDate);
        current.setUTCDate(firstDate.getUTCDate() + index);
        const date = dateString(current);
        const schedule = data.findScheduleByChildAndDate(childId, date);
        const tasks = schedule ? data.tasksForSchedule(schedule.id) : [];
        const done = tasks.filter((task) => task.status === 'done').length;
        return {
          date,
          done,
          total: tasks.length,
          percentage: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100),
          tasks,
        };
      });

      const startTimestamp = firstDate.getTime();
      const nowTimestamp = Date.now();
      const recentCompletions = days
        .flatMap((day) =>
          day.tasks
            .filter((task) => {
              if (task.status !== 'done' || !task.completed_at) return false;
              const completedAt = Date.parse(task.completed_at);
              return completedAt >= startTimestamp && completedAt <= nowTimestamp;
            })
            .map((task) => ({
              task_id: task.id,
              name: task.name,
              icon: task.icon,
              schedule_date: day.date,
              completed_at: task.completed_at,
            })),
        )
        .sort((a, b) => Date.parse(b.completed_at!) - Date.parse(a.completed_at!));

      const today = days[days.length - 1]!;
      res.json({
        child_id: childId,
        range,
        today: {
          date: today.date,
          done: today.done,
          total: today.total,
          percentage: today.percentage,
        },
        last_7_days: days.map(({ date, done, total, percentage }) => ({ date, done, total, percentage })),
        recent_completions: recentCompletions,
      });
    }),
  );

  return router;
}

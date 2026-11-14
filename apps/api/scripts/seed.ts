import 'dotenv/config';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DEFAULT_PICTURE_CARDS } from '../src/group5/repository.js';
import { closeDatabasePool, getDatabasePool } from '../src/db/pool.js';

const activities = [
  { name: 'Wake up', icon: '🌅', category: 'other' },
  { name: 'Brush teeth', icon: '🪥', category: 'hygiene' },
  { name: 'Wash hands', icon: '🧼', category: 'hygiene' },
  { name: 'Eat breakfast', icon: '🍳', category: 'food' },
  { name: 'Get dressed', icon: '👕', category: 'other' },
  { name: 'Toilet', icon: '🚽', category: 'hygiene' },
  { name: 'Go to school', icon: '🏫', category: 'school' },
  { name: 'Learning activity', icon: '📚', category: 'school' },
  { name: 'Play', icon: '🧸', category: 'play' },
  { name: 'Bath', icon: '🛁', category: 'hygiene' },
  { name: 'Get ready for bed', icon: '🌙', category: 'other' },
] as const;

const demoChildren = [
  {
    name: 'Avery',
    age: 5,
    delayDomain: 'speech',
    avatar: '🐻',
    tasks: [
      { activity: 'Wake up', startTime: '07:00', duration: 5 },
      { activity: 'Brush teeth', startTime: '07:10', duration: 5 },
      { activity: 'Eat breakfast', startTime: '07:20', duration: 20 },
      { activity: 'Get dressed', startTime: '07:45', duration: 10 },
      { activity: 'Go to school', startTime: '08:00', duration: 30 },
    ],
  },
  {
    name: 'Jordan',
    age: 7,
    delayDomain: 'motor',
    avatar: '🐼',
    tasks: [
      { activity: 'Wake up', startTime: '07:00', duration: 5 },
      { activity: 'Wash hands', startTime: '07:10', duration: 5 },
      { activity: 'Eat breakfast', startTime: '07:20', duration: 20 },
      { activity: 'Learning activity', startTime: '09:00', duration: 30 },
      { activity: 'Play', startTime: '10:00', duration: 20 },
    ],
  },
  {
    name: 'Riley',
    age: 6,
    delayDomain: 'social',
    avatar: '🦊',
    tasks: [
      { activity: 'Wake up', startTime: '07:30', duration: 5 },
      { activity: 'Get dressed', startTime: '07:40', duration: 10 },
      { activity: 'Go to school', startTime: '08:15', duration: 30 },
      { activity: 'Bath', startTime: '18:30', duration: 15 },
      { activity: 'Get ready for bed', startTime: '19:00', duration: 10 },
    ],
  },
] as const;

interface IdRow extends RowDataPacket {
  id: number;
}

async function findId(
  connection: PoolConnection,
  sql: string,
  values: readonly unknown[],
): Promise<number> {
  const [rows] = await connection.execute<IdRow[]>(sql, [...values]);
  const row = rows[0];
  if (!row) {
    throw new Error('Expected seeded record was not found.');
  }
  return row.id;
}

async function seedData(): Promise<void> {
  try {
    const connection = await getDatabasePool().getConnection();
    try {
      await connection.beginTransaction();

      for (const activity of activities) {
        await connection.execute(
          `INSERT INTO activities (name, icon, category)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE icon = VALUES(icon), category = VALUES(category)`,
          [activity.name, activity.icon, activity.category],
        );
      }

      for (const card of DEFAULT_PICTURE_CARDS) {
        await connection.execute(
          `INSERT INTO picture_cards (child_id, category, label, icon)
           SELECT NULL, ?, ?, ?
           WHERE NOT EXISTS (
             SELECT 1 FROM picture_cards
             WHERE child_id IS NULL AND category = ? AND label = ?
           )`,
          [card.category, card.label, card.icon, card.category, card.label],
        );
      }

      await connection.execute(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES (?, ?, NULL, 'caregiver')
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        ['Demo Caregiver', 'demo@special-project.invalid'],
      );
      const demoUserId = await findId(
        connection,
        'SELECT id FROM users WHERE email = ?',
        ['demo@special-project.invalid'],
      );

      for (const child of demoChildren) {
        await connection.execute(
          `INSERT INTO children (user_id, name, age, delay_domain, avatar)
           SELECT ?, ?, ?, ?, ?
           WHERE NOT EXISTS (
             SELECT 1 FROM children WHERE user_id = ? AND name = ?
           )`,
          [
            demoUserId,
            child.name,
            child.age,
            child.delayDomain,
            child.avatar,
            demoUserId,
            child.name,
          ],
        );
        const childId = await findId(
          connection,
          'SELECT id FROM children WHERE user_id = ? AND name = ?',
          [demoUserId, child.name],
        );

        await connection.execute(
          `INSERT INTO schedules (child_id, schedule_date)
           VALUES (?, CURRENT_DATE())
           ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
          [childId],
        );
        const scheduleId = await findId(
          connection,
          'SELECT id FROM schedules WHERE child_id = ? AND schedule_date = CURRENT_DATE()',
          [childId],
        );

        for (const [index, task] of child.tasks.entries()) {
          const activityId = await findId(
            connection,
            'SELECT id FROM activities WHERE name = ?',
            [task.activity],
          );
          await connection.execute<ResultSetHeader>(
            `INSERT INTO tasks (
               schedule_id, activity_id, name, icon, start_time, duration_min, position
             )
             SELECT ?, id, name, icon, ?, ?, ? FROM activities WHERE id = ?
             ON DUPLICATE KEY UPDATE
               activity_id = VALUES(activity_id),
               name = VALUES(name),
               icon = VALUES(icon),
               start_time = VALUES(start_time),
               duration_min = VALUES(duration_min),
               status = 'pending',
               completed_at = NULL`,
            [scheduleId, task.startTime, task.duration, index + 1, activityId],
          );
        }
      }

      await connection.commit();
      console.log('Seeded activities, default picture cards, and demo schedules.');
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } finally {
    await closeDatabasePool();
  }
}

void seedData().catch((error: unknown) => {
  console.error('Failed to seed the database:', error);
  process.exitCode = 1;
});

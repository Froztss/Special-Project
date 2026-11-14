import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { PictureCardCategory } from '@starter/shared';
import { getDatabasePool } from '../db/pool.js';

export const CARD_CATEGORIES: PictureCardCategory[] = ['Food', 'Emotions', 'Activities', 'Needs'];

export const DEFAULT_PICTURE_CARDS = [
  { category: 'Food', label: 'Water', icon: '💧' },
  { category: 'Food', label: 'Milk', icon: '🥛' },
  { category: 'Food', label: 'Rice', icon: '🍚' },
  { category: 'Food', label: 'Bread', icon: '🍞' },
  { category: 'Emotions', label: 'Happy', icon: '😊' },
  { category: 'Emotions', label: 'Sad', icon: '😢' },
  { category: 'Emotions', label: 'Tired', icon: '😴' },
  { category: 'Activities', label: 'Play', icon: '🧸' },
  { category: 'Activities', label: 'TV', icon: '📺' },
  { category: 'Needs', label: 'Toilet', icon: '🚽' },
] as const satisfies readonly { category: PictureCardCategory; label: string; icon: string }[];

export interface PictureCard {
  id: number;
  child_id: number | null;
  category: PictureCardCategory;
  label: string;
  icon: string;
  is_hidden: boolean;
}
export interface NewPictureCard {
  childId: number;
  category: PictureCardCategory;
  label: string;
  icon: string;
}

export interface UserSettings {
  font_size: 'small' | 'medium' | 'large';
  contrast: 'normal' | 'high';
  sound_on: boolean;
}

export interface Group5Repository {
  ownsChild(childId: number, userId: number): Promise<boolean>;
  listCardsForChild(childId: number, includeHidden: boolean): Promise<PictureCard[]>;
  createCardForUser(userId: number, input: NewPictureCard): Promise<PictureCard | null>;
  setCardHiddenForUser(cardId: number, userId: number, hidden: boolean): Promise<PictureCard | null>;
  deleteCardForUser(cardId: number, userId: number): Promise<boolean>;
  getSettings(userId: number): Promise<UserSettings>;
  updateSettings(userId: number, settings: UserSettings): Promise<UserSettings>;
}

interface PictureCardRow extends RowDataPacket {
  id: number | string;
  child_id: number | string | null;
  category: PictureCardCategory;
  label: string;
  icon: string;
  is_hidden: number | boolean;
}

interface SettingsRow extends RowDataPacket {
  font_size: UserSettings['font_size'];
  contrast: UserSettings['contrast'];
  sound_on: number | boolean;
}

function mapPictureCard(row: PictureCardRow): PictureCard {
  return {
    id: Number(row.id),
    child_id: row.child_id === null ? null : Number(row.child_id),
    category: row.category,
    label: row.label,
    icon: row.icon,
    is_hidden: Boolean(row.is_hidden),
  };
}

function mapSettings(row: SettingsRow | undefined): UserSettings {
  if (!row) {
    throw new Error('Settings row was not found after initialization.');
  }
  return {
    font_size: row.font_size,
    contrast: row.contrast,
    sound_on: Boolean(row.sound_on),
  };
}

export class MySqlGroup5Repository implements Group5Repository {
  async ownsChild(childId: number, userId: number): Promise<boolean> {
    const [rows] = await getDatabasePool().execute<RowDataPacket[]>(
      'SELECT id FROM children WHERE id = ? AND user_id = ? LIMIT 1',
      [childId, userId],
    );
    return rows.length > 0;
  }

  async listCardsForChild(childId: number, includeHidden: boolean): Promise<PictureCard[]> {
    const [rows] = await getDatabasePool().execute<PictureCardRow[]>(
      `SELECT id, child_id, category, label, icon, is_hidden
       FROM picture_cards
       WHERE (child_id IS NULL OR child_id = ?)
         AND (child_id IS NULL OR is_hidden = FALSE OR ? = TRUE)
       ORDER BY FIELD(category, 'Food', 'Emotions', 'Activities', 'Needs'), id`,
      [childId, includeHidden],
    );
    return rows.map(mapPictureCard);
  }

  async createCardForUser(userId: number, input: NewPictureCard): Promise<PictureCard | null> {
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `INSERT INTO picture_cards (child_id, category, label, icon)
       SELECT id, ?, ?, ? FROM children WHERE id = ? AND user_id = ?`,
      [input.category, input.label, input.icon, input.childId, userId],
    );
    if (result.affectedRows === 0) return null;
    const [rows] = await getDatabasePool().execute<PictureCardRow[]>(
      `SELECT id, child_id, category, label, icon, is_hidden
       FROM picture_cards WHERE id = ?`,
      [result.insertId],
    );
    const row = rows[0];
    if (!row) throw new Error('Created picture card could not be read back.');
    return mapPictureCard(row);
  }

  async setCardHiddenForUser(
    cardId: number,
    userId: number,
    hidden: boolean,
  ): Promise<PictureCard | null> {
    await getDatabasePool().execute(
      `UPDATE picture_cards AS card
       JOIN children AS child ON child.id = card.child_id
       SET card.is_hidden = ?
       WHERE card.id = ? AND child.user_id = ?`,
      [hidden, cardId, userId],
    );
    const [rows] = await getDatabasePool().execute<PictureCardRow[]>(
      `SELECT card.id, card.child_id, card.category, card.label, card.icon, card.is_hidden
       FROM picture_cards AS card
       JOIN children AS child ON child.id = card.child_id
       WHERE card.id = ? AND child.user_id = ?`,
      [cardId, userId],
    );
    return rows[0] ? mapPictureCard(rows[0]) : null;
  }

  async deleteCardForUser(cardId: number, userId: number): Promise<boolean> {
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `DELETE card FROM picture_cards AS card
       JOIN children AS child ON child.id = card.child_id
       WHERE card.id = ? AND child.user_id = ?`,
      [cardId, userId],
    );
    return result.affectedRows > 0;
  }

  async getSettings(userId: number): Promise<UserSettings> {
    await getDatabasePool().execute(
      `INSERT INTO settings (user_id) VALUES (?)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
      [userId],
    );
    const [rows] = await getDatabasePool().execute<SettingsRow[]>(
      'SELECT font_size, contrast, sound_on FROM settings WHERE user_id = ?',
      [userId],
    );
    return mapSettings(rows[0]);
  }

  async updateSettings(userId: number, settings: UserSettings): Promise<UserSettings> {
    await getDatabasePool().execute(
      `INSERT INTO settings (user_id, font_size, contrast, sound_on)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         font_size = ?, contrast = ?, sound_on = ?`,
      [
        userId,
        settings.font_size,
        settings.contrast,
        settings.sound_on,
        settings.font_size,
        settings.contrast,
        settings.sound_on,
      ],
    );
    return settings;
  }
}

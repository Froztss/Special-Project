import * as mockData from './data.js';
import {
  DEFAULT_PICTURE_CARDS,
  type Group5Repository,
  type NewPictureCard,
  type PictureCard,
  type UserSettings,
} from '../group5/repository.js';

const DEFAULT_SETTINGS: UserSettings = {
  font_size: 'medium',
  contrast: 'normal',
  sound_on: true,
};

export class InMemoryGroup5Repository implements Group5Repository {
  private customCards: PictureCard[] = [];
  private settings = new Map<number, UserSettings>();
  private nextCardId = DEFAULT_PICTURE_CARDS.length + 1;

  reset(): void {
    this.customCards = [];
    this.settings.clear();
    this.nextCardId = DEFAULT_PICTURE_CARDS.length + 1;
  }

  async ownsChild(childId: number, userId: number): Promise<boolean> {
    return mockData.findChildForUser(childId, userId) !== undefined;
  }

  async listCardsForChild(childId: number, includeHidden: boolean): Promise<PictureCard[]> {
    const defaults = DEFAULT_PICTURE_CARDS.map((card, index) => ({
      ...card,
      id: index + 1,
      child_id: null,
      is_hidden: false,
    }));
    return [...defaults, ...this.customCards.filter((card) => card.child_id === childId)]
      .filter((card) => includeHidden || !card.is_hidden)
      .map((card) => ({ ...card }));
  }

  async createCardForUser(userId: number, input: NewPictureCard): Promise<PictureCard | null> {
    if (!mockData.findChildForUser(input.childId, userId)) return null;
    const card: PictureCard = {
      id: this.nextCardId++,
      child_id: input.childId,
      category: input.category,
      label: input.label,
      icon: input.icon,
      is_hidden: false,
    };
    this.customCards.push(card);
    return { ...card };
  }

  async setCardHiddenForUser(
    cardId: number,
    userId: number,
    hidden: boolean,
  ): Promise<PictureCard | null> {
    const card = this.customCards.find(
      (item) =>
        item.id === cardId &&
        item.child_id !== null &&
        mockData.findChildForUser(item.child_id, userId),
    );
    if (!card) return null;
    card.is_hidden = hidden;
    return { ...card };
  }

  async deleteCardForUser(cardId: number, userId: number): Promise<boolean> {
    const index = this.customCards.findIndex(
      (card) =>
        card.id === cardId &&
        card.child_id !== null &&
        mockData.findChildForUser(card.child_id, userId),
    );
    if (index === -1) return false;
    this.customCards.splice(index, 1);
    return true;
  }

  async getSettings(userId: number): Promise<UserSettings> {
    const settings = this.settings.get(userId) ?? { ...DEFAULT_SETTINGS };
    this.settings.set(userId, settings);
    return { ...settings };
  }

  async updateSettings(userId: number, settings: UserSettings): Promise<UserSettings> {
    this.settings.set(userId, { ...settings });
    return { ...settings };
  }
}

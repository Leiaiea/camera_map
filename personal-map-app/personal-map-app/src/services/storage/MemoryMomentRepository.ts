import type { Moment } from '../../models/moment';
import type { MomentRepository } from './MomentRepository';

export class MemoryMomentRepository implements MomentRepository {
  private moments: Moment[] = [];

  async list(): Promise<Moment[]> {
    return [...this.moments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async save(moment: Moment): Promise<Moment> {
    this.moments = [moment, ...this.moments.filter((item) => item.id !== moment.id)];
    return moment;
  }

  async delete(id: string): Promise<void> {
    this.moments = this.moments.filter((item) => item.id !== id);
  }
}

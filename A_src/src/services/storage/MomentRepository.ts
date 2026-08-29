import type { Moment } from '../../models/moment';

export interface MomentRepository {
  list(): Promise<Moment[]>;
  save(moment: Moment): Promise<Moment>;
  delete(id: string): Promise<void>;
}

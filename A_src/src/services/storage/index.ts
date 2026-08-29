import { MemoryMomentRepository } from './MemoryMomentRepository';
import type { MomentRepository } from './MomentRepository';

// 第一阶段使用内存实现；替换为 IndexedDbMomentRepository 不影响页面与 Moment 流程。
export const momentRepository: MomentRepository = new MemoryMomentRepository();
export type { MomentRepository } from './MomentRepository';

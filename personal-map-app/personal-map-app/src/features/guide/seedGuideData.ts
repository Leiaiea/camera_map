export interface SeedGuideItem {
  id: string;
  label: string;
  color: string;
  rotation: number;
  drawing: string;
}

export const SEED_GUIDE_ITEMS: SeedGuideItem[] = [
  { id: 'cat', label: '一只你总遇见的猫', color: '#d9a877', rotation: -1.3, drawing: '<path d="M42 67c-4-11-2-29 7-35l6 7 9-8 6 8c9 7 9 25 3 34M48 63c5 4 16 4 22 0M53 50h1M66 50h1M57 57c2 2 5 2 7 0M42 62l-10 5M43 69l-11 10M75 62l10 5M74 69l10 10"/>' },
  { id: 'stall', label: '每天路过的早餐摊', color: '#d8a15d', rotation: 0.8, drawing: '<path d="M29 74h54M35 74V45h42v29M29 45h54l-5-16H34zM40 45v-9M51 45v-9M62 45v-9M73 45v-9M42 57h11M42 64h11M63 56h8v18"/>' },
  { id: 'tree', label: '一棵你总经过却没看清的树', color: '#9cac82', rotation: -1, drawing: '<path d="M56 77V55M56 61l-9 10M56 66l9 9M56 56c-15 0-23-11-19-21 2-7 10-10 16-6 3-10 17-11 20-1 9-4 16 4 13 12 7 8-1 19-14 17-4 5-11 6-16 3zM27 77h58"/>' },
  { id: 'sunset', label: '窗外的一次落日', color: '#d99373', rotation: 1.2, drawing: '<path d="M27 72h58M31 63c9-6 18 5 27-1 9-6 16 2 24-3M56 52a13 13 0 1 0 0-26 13 13 0 0 0 0 26zM56 18v-7M37 25l-5-5M75 25l5-5M32 45h-8M80 45h8"/>' },
  { id: 'shop', label: '深夜还亮着灯的一家店', color: '#c89a70', rotation: -0.4, drawing: '<path d="M31 76V43h50v33M27 43h58l-5-15H32zM39 43v-8M50 43v-8M62 43v-8M73 43v-8M40 55h13v21M63 54h10v10H63zM47 66h1M69 59h1"/>' },
  { id: 'water', label: '你桌上的一杯水', color: '#8eafbd', rotation: 1.1, drawing: '<path d="M43 35h26l-3 38H46zM43 45h26M69 42c9-7 16-1 13 9-2 7-8 10-14 7M48 28c2-7 9-9 13-4M34 77h46"/>' },
];

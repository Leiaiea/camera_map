import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'personal-map.stickerGenerationEnabled';
// TODO: demo 后删除开关 UI 时，将此默认值改为 true；状态源本身保留给其他页面使用。
const DEFAULT_STICKER_GENERATION_ENABLED = false;

interface StickerGenerationContextValue {
  stickerGenerationEnabled: boolean;
  setStickerGenerationEnabled: (enabled: boolean) => void;
}

const StickerGenerationContext = createContext<StickerGenerationContextValue | null>(null);

function readInitialValue(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? DEFAULT_STICKER_GENERATION_ENABLED : stored === 'true';
  } catch {
    return DEFAULT_STICKER_GENERATION_ENABLED;
  }
}

export function StickerGenerationProvider({ children }: { children: ReactNode }) {
  const [stickerGenerationEnabled, setStickerGenerationEnabled] = useState(readInitialValue);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(stickerGenerationEnabled));
    } catch {
      // localStorage 不可用时仅在当前会话保持状态。
    }
  }, [stickerGenerationEnabled]);

  const value = useMemo(() => ({ stickerGenerationEnabled, setStickerGenerationEnabled }), [stickerGenerationEnabled]);
  return <StickerGenerationContext.Provider value={value}>{children}</StickerGenerationContext.Provider>;
}

export function useStickerGeneration() {
  const context = useContext(StickerGenerationContext);
  if (!context) throw new Error('useStickerGeneration must be used inside StickerGenerationProvider');
  return context;
}

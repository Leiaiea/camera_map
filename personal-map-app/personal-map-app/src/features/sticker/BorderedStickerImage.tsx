import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { getBorderedStickerUrl } from '../../services/media/stickerBorder';

interface BorderedStickerImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  stickerId: string;
  sourceUrl: string;
}

/** React 展示入口：边框尚未就绪时不输出裸图，防止动画和详情出现跳变。 */
export function BorderedStickerImage({ stickerId, sourceUrl, ...props }: BorderedStickerImageProps) {
  const [borderedUrl, setBorderedUrl] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    setBorderedUrl(undefined);
    void getBorderedStickerUrl(stickerId, sourceUrl)
      .then((url) => { if (!cancelled) setBorderedUrl(url); })
      .catch((error: unknown) => console.warn('[sticker] 贴纸边框生成失败，已阻止裸图显示。', { stickerId, error }));
    return () => { cancelled = true; };
  }, [sourceUrl, stickerId]);
  return borderedUrl ? <img {...props} src={borderedUrl} /> : null;
}

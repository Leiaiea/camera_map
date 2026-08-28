# LUT 来源说明

这里的 `.cube` 文件全部由 `tools/bake_luts.py` 生成，**不要手改**——重跑一次就会被覆盖。

## 为什么用 LUT 而不是 pilgram

LUT 是**可移植的数据资产**，这是选它的唯一理由：

- 桌面：Pillow `ImageFilter.Color3DLUT`
- iOS：`CIColorCube` / `CIColorCubeWithColorSpace`
- Android：GPU shader 采样 3D 纹理

同一个 `.cube` 三端吃同一份数据，观感自然一致。而 `pilgram` / `pilgram2` 是 Python 里的 CSS 滤镜实现，移植不到手机，所以本项目没装它们。

## 调性从哪来

不是凭感觉调的，而是从 `photo-map-explorations` 已有的 CSS `filter:` 链按 W3C Filter Effects 规范算出来的。原型 38 个 CSS 文件里已经积累了几十条链，那就是既有的视觉调性；把它们烘焙成 LUT，工具产出和原型天然同源。

想看原型里还有哪些链可选：

```bash
python tools/bake_luts.py --scan ../photo-map-explorations
```

## 当前的 LUT

| 文件 | 来源 CSS filter 链 | 用途 |
|---|---|---|
| `identity.cube` | `none` | 恒等表，作用后像素零变化。**测试专用**，用来守住 `.cube` 索引顺序不被改坏 |
| `paper-muted.cube` | `saturate(.65) contrast(1.03) brightness(.68)` | 扫描页调性，低饱和压暗，最接近原型的纸感基调。`recipes/paper-muted.json` 用它 |
| `paper-warm.cube` | `sepia(.18) saturate(.82) contrast(1.03)` | 轻微暖调偏黄，接近 `--paper #f4f2eb` 的纸张感 |
| `paper-rose.cube` | `saturate(.55) sepia(.3) hue-rotate(310deg) contrast(.9) brightness(1.1)` | 偏玫瑰色的柔和调性，来自撕页染色一类实验 |
| `paper-deep.cube` | `saturate(.72) contrast(1.1) brightness(.62)` | 更重的压暗高对比，适合需要主体沉下去的场景 |

网格边长统一 33（Pillow 上限 65，33 已足够且文件小）。

## 哪些 CSS filter 进不了 LUT

`blur` 和 `drop-shadow` 是**空间性**滤镜——输出像素依赖邻域，不是逐像素颜色映射，因此无法表示成 3D LUT。烘焙时会自动跳过并在文件头注释里记一笔。

其中 `drop-shadow` 由贴纸阶段的 `sticker.shadow` 参数承接，默认值直接取自原型的 `filter:drop-shadow(0 8px 7px #534d4555)`。

## 索引顺序（改代码前必读）

`.cube` 规范里数据行按 **R 变化最快** 排列，每行一个 RGB 输出值；Pillow `Color3DLUT` 的 table 要求「先通道，再第一维，再第二维，再第三维」。两者一致，所以数据行可以直接顺序展开喂进去。

搞反的后果是 R/B 互换——颜色会偏，但不容易一眼看出。`tests/test_lut.py` 里的 `test_identity_lut_is_pixel_exact` 和 `test_identity_lut_does_not_swap_channels` 就是专门守这一条的，别删。

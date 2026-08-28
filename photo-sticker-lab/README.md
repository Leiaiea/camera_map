# 照片贴纸实验室

把真实照片变成可以放到个人地图上的**白边贴纸**：抠图 → 自动校色 → 加白边。

这是 `photo-map-explorations` 原型里那个「主体识别 + 抠图」能力的**真实实现**，同时也是未来手机应用的参考实现、调参台和基准图集。

```bash
# 一句话上手
source .venv/Scripts/activate
python -m photo_sticker single ../ptoto/教堂.jpg --emit-intermediates
```

---

## 1. 产品背景（下次打开先看这段）

整个项目要做的体验是：**拍照 → 识别并抠出主体 → 主体被「送达」到一张空白地图上并永久留下**。地图是个人的，去过的地方会一点点长出来。

`photo-map-explorations/` 是这个体验的静态网页原型，里面有 **15 种「送达」隐喻**（详见它自己的 README）：空降快递、景色扫描、画框传递、棱镜海市蜃楼、魔法召唤、任意门、施工图建造、撕页染色、邮差来信、地下宝藏、抓娃娃机、彩云下雨、撕开地图、天眼海市蜃楼、钢笔线稿。

每个实验都有两页：拍照页 + 地图页。

## 2. 原型现在「假」在哪（关键背景）

原型看起来在做主体识别和抠图，**其实完全是假的**：

- 所谓抠图是 `photo-map-explorations/styles.css:15` 里一条**手写的** `clip-path:polygon(5% 100%,5% 41%,...)`，人工描出教堂双塔的轮廓，**只对 `assets/church.jpg` 那一张照片有效**，换任何一张照片都会错位。
- 所谓滤镜是几十条 CSS `filter:` 链，比如 `filter:saturate(.65) contrast(1.03) brightness(.68)`。
- 全仓库没有 `<canvas>`、没有 `getImageData`、没有任何真实的像素处理。

**本工具就是来补上这块的**，产出真正的透明 PNG。

## 3. 本工具与原型的关系：当前不联动

这是**明确的决定，不是遗漏**。工具产出独立的 PNG + 配方 JSON，不改动原型的任何文件。

原因：原型的 38 个 CSS 文件靠**加载顺序层层覆盖**（`door.css` → `door-direction.css` → `door-motion.css` → `door-correct.css` → `door-sequence.css` → `door-visibility.css`，`claw` 系列有八个），现在动它风险高、收益低。

将来若要接回去，做法是：把工具输出的 PNG 放进 `assets/`，删掉对应的 `clip-path` 那一行，换掉 `<img src>`。原型里 `assets/church.jpg` 被引用 33 次（`<img src>`）+ 4 次（CSS `url()`）。

## 4. 管线顺序：抠图 → 校色 → 白边（不要改成先滤镜）

最初的设想是「滤镜 → 抠图 → 白边」，**实现时反过来了**，两条独立理由：

1. **模型精度**：matting 模型在自然图像分布上训练。先做重调色（压暗、扭色）会把输入推离该分布，掩膜质量下降。
2. **更重要的一条**：抠图之后，自动校色可以**只统计主体像素**（`measure_on: "subject"`，取 alpha > 200 的像素）。天空和杂乱背景不再把曝光和白平衡拉偏。`ptoto/` 这批照片来源混杂（相机原图 + 手机截图 + 降采样图），这个收益很直接。

另外，颗粒、暗角一类效果如果在抠图前做，会被掩膜切得不连贯，也是先抠图更合理。

**硬约束**：校色阶段的 alpha 通道必须逐像素不变。`tests/test_grade.py` 用 `np.array_equal` 守这条，`pipeline.py` 每张图也会实测并在 alpha 被改动时告警。

## 5. 模型选择的依据（别倒回默认值）

rembg 自带的默认模型是 `u2net`，**本项目刻意不用它**。Cloudflare 的独立评测数据：

| 模型 | IoU | Dice | 备注 |
|---|---|---|---|
| `birefnet-general` | **0.87** | **0.92** | 本项目默认 |
| `isnet-general-use` | 0.82 | 0.89 | 质量/速度平衡点 |
| 泛化 U²Net | 人像 0.89 / **非人像 0.39** | — | 在 DIS5K 上塌掉 |

`ptoto/` 这 29 张是**物体和风景**（教堂、金鱼、冰箱贴、公园长椅、大月季、秋千），不是人像，正好落在 U²Net 最弱的区间。所以默认 `birefnet-general`。

`u2netp`（约 4.7 MB）和 `silueta`（43 MB）保留下来的目的是**对照未来手机端的体量与速度**，不是拿来当默认值的。

rembg 只是 ONNX 模型的 wrapper，换模型是 `--model` 参数，不涉及改代码。

**alpha matting 默认关闭**：birefnet / isnet 已经输出足够柔和的 alpha，反射性开 matting 反而会变差（rembg 官方当前也这么建议）。毛发类主体才考虑 ViTMatte（额外 110 MB、更慢）。

## 6. SAM 的定位（不是精度不够时的替代品）

最初设想「若精度不够可换 SAM」，这个定位是错的：

- SAM **不是自动分割**，必须给 point 或 box prompt，替不了 rembg 的全自动流程；
- ViT-H 权重约 2.4 GB，上不了手机。

但原型的提示语已经是 `'框住想留下的教堂'`（`app.js:45`），说明 **UX 本来就有框**。所以 SAM 的正确位置是**第二阶段的交互式修补层**：自动抠图先出结果，用户不满意时框一下重抠。移动端选 MobileSAM / EfficientViT-SAM。

## 7. 移动端移植对照表

Pillow / rembg / pilgram 三个都**过不去**手机端。能过去的是数据和算法：

| 能力 | 桌面实现 | 能否直接复用 | 移动端方案 |
|---|---|---|---|
| 抠图 | rembg + ONNX Runtime | ✗ Python | iOS 17+ `VNGenerateForegroundInstanceMaskRequest`（Vision，走 ANE，耗资源要放后台线程，用 `generateScaledMaskForImage(forInstances:from:)` 拿高清掩膜转 CIImage）；Android ML Kit Subject Segmentation（体积仅约 +200 KB，但**仍是 beta、无 SLA、可能破坏兼容**，首次推理慢需启动时预热）；兜底走 ONNX Runtime Mobile |
| 风格滤镜 | `.cube` + Pillow `Color3DLUT` | ✓ **LUT 文件直接复用** | iOS `CIColorCube` / `CIColorCubeWithColorSpace`；Android GPU shader 采样 3D 纹理 |
| 自动校色 | numpy 百分位 + 灰世界 | ✓ 算法与参数复用 | 按配方 JSON 重写，几十行 |
| 白边 | Pillow alpha 膨胀 | ✓ 算法复用 | 同一套顺序与常数，平台原生重写 |
| 参数 | `recipes/*.json` | ✓ **同一份 JSON** | 直接读 |

**若走 ONNX Runtime Mobile 需注意**：优先 CPU EP（模型已量化）或 XNNPACK，只有达不到性能目标才上 NNAPI（Android 8.1+，9+ 更好）/ CoreML（iOS 13+，最好有 ANE）。encoder-decoder 分割网**常被切成多个分区，反而比纯 CPU 更慢**——每次 NPU↔CPU 切换都有开销。先跑 ORT 的 model usability checker 看分区覆盖率，并用 `python -m onnxruntime.tools.make_dynamic_shape_fixed` 固定动态 shape（U²Net / BiRefNet 导出时 H/W 通常是动态的）。

**结论**：这个桌面工具真正的产出不是「一个能跑的脚本」，而是**参考实现 + 参数配方 + golden 基准图集**——手机端重写后，拿同样的输入跑出来的结果去和 `out/` 里的基准比对。

## 8. 怎么跑

### 环境（Windows Git Bash）

```bash
cd photo-sticker-lab
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
python -m photo_sticker fetch-models          # 预下载模型，之后可离线
```

模型缓存在 `models/`（通过 `U2NET_HOME` 指过去），已在 `.gitignore` 里——权重上百 MB，不该进 git 历史。

### 常用命令

```bash
# 单张，同时输出中间产物（_mask / _cutout / _graded）
python -m photo_sticker single ../ptoto/教堂.jpg --emit-intermediates

# 批量整个目录，指定配方
python -m photo_sticker batch ../ptoto --recipe paper-muted -o out/batch-01

# 横向比模型（调参主力之一）
python -m photo_sticker compare ../ptoto/小狗.jpg \
  --models birefnet-general,isnet-general-use,u2netp

# 扫任意配方字段，出对比长图
python -m photo_sticker compare ../ptoto/冰箱贴.jpg \
  --sweep sticker.border.width_ratio=0.01,0.02,0.04

# 看最终生效的参数（合并默认值之后）
python -m photo_sticker inspect --recipe paper-muted
```

`compare` 会把所有变体拼成一张对比长图，透明区垫棋盘格。**这是纯 CLI 形态能好用的关键**——不做 GUI，用系统图片查看器翻长图就能调参。

### 重新烘焙 LUT

```bash
python tools/bake_luts.py
python tools/bake_luts.py --scan ../photo-map-explorations   # 看原型里还有哪些 filter 链
```

### 跑测试

```bash
pip install pytest
python -m pytest tests/ -q
```

## 9. 已知的坑（都已处理，改代码前先读）

- **`.cube` 索引顺序**：数据行按 R 变化最快排列，与 Pillow `Color3DLUT` 的 table 排布一致。搞反的后果是 R/B 互换，颜色偏了但不易察觉。`tests/test_lut.py` 的恒等 LUT 测试专门守这条，别删。
- **白边被裁**：必须**先** `ImageOps.expand` 扩画布**再**膨胀 alpha，否则贴边主体的白边直接被切掉。这是最常踩的坑。
- **只膨胀 alpha，绝不动 RGB**：否则主体颜色会向外糊开。`test_rgb_channels_not_dilated` 守这条。
- **平色主体被压黑**：自动色阶的百分位上下界在纯色主体上几乎重合，早期实现除以极小跨度会把主体压成纯黑。冰箱贴、均匀光照的墙面都会触发。已加 `MIN_LEVEL_SPAN` / `MAX_LEVEL_GAIN` 安全阀，`test_flat_subject_is_not_crushed_to_black` 是回归测试。
- **中文路径**：`ptoto/` 里全是中文文件名。**不能用 OpenCV**——`cv2.imread` 接受 `char*`，非 ASCII 路径直接读不到（要 `np.fromfile` + `cv2.imdecode` 绕）。Pillow 对 unicode 路径没问题，所以本项目只用 Pillow + numpy。
- **Windows 控制台编码**：默认 GBK 代码页会把中文输出打成乱码甚至抛 `UnicodeEncodeError`。所有入口先调 `console.setup()` 切 UTF-8。
- **onnxruntime 版本必须钉 1.19.2**：本机 `msvcp140.dll` 是 14.27（VS 2019 运行时），onnxruntime ≥ 1.20 的预编译轮子需要更新的 VC++ 运行时，导入时报 `DLL load failed while importing onnxruntime_pybind11_state`。装了新版 VC++ Redistributable 后可放宽。
- **EXIF 方向**：相机原图常带方向标记，不用 `ImageOps.exif_transpose` 转正的话成品会躺着。
- **大图性能**：4096px 原图直接推理在 CPU 上是几十秒级。`inference_max_side`（默认 2048）先降采样跑推理，再把掩膜放大回原尺寸贴到**原始像素**上——RGB 不损失分辨率。

<!-- APPEND-2 -->

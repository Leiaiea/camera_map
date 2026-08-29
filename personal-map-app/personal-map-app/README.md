# 个人地图（personal-map-app）

React + Vite + TypeScript 的移动端 Moment 地图应用。当前版本接入高德地图 2.0，保留“拍摄 → 互动 → 保存 Moment → 抵达地图”的完整流程，并以贴纸、水彩地面染色和 3D 灰白地图呈现记忆。

## 启动与环境变量

```bash
npm install
npm run dev
```

在 `.env.local` 中配置（不要提交密钥）：

```dotenv
VITE_AMAP_KEY=...
VITE_AMAP_SECURITY_CODE=...
VITE_REMOVEBG_KEY=...
# 开发时默认使用本地 mock；设为 false 才会真实调用 remove.bg。
VITE_REMOVEBG_MOCK=true
```

- 高德地图与逆地理编码读取 `VITE_AMAP_KEY`、`VITE_AMAP_SECURITY_CODE`。
- remove.bg 读取 `VITE_REMOVEBG_KEY`；只有地图页“贴纸生成：开”且 mock 关闭时才会请求 API。
- remove.bg 最长等待 30 秒、最多一次请求，不做重试风暴；失败时 Moment 仍会立即用原图上图。

## 当前地图与隐私规则

- 地图坐标**只能**使用 `blurredLatitude` / `blurredLongitude`（GCJ-02）；严禁用真实 `latitude` / `longitude` 落点。
- `accuracyMeters` 对应的是隐私模糊半径参考，不是 GPS 定位精度，不能用于任何定位精度逻辑。
- 地图实例只创建一次；贴纸增删、抠图回写与到达动画都不重建地图。
- 地图离开后保持实例，回来只恢复显示并 `resize()`。
- 默认关闭 3D 房屋，只保留灰白低饱和底图与 3D 俯仰镜头。
- demo 默认固定定位，不会触发设备权限或黄色定位失败提示；演示结束后可一键恢复真实定位。

## 调参与演示素材

日常视觉、位置和 demo 调整统一在 [`src/config/mapDemoTuning.ts`](src/config/mapDemoTuning.ts)。文件中的中文注释说明了每一项用途。

常用项：

- `USE_FIXED_LOCATION`：`true` 使用固定 demo 坐标；改为 `false` 恢复真实定位。
- `DEMO_FIXED_LOCATION`、`DEMO_EXAMPLE_LOCATION`：固定定位点与示例贴纸坐标（GCJ-02）。
- `DEMO_MEMORY_STICKERS`：demo 贴纸清单；新增时填写 `latitude`、`longitude` 和 `image` 文件名即可。
- `MAP_STICKER_DISPLAY_PX`：地图贴纸显示尺寸。
- `STICKER_OUTLINE_RATIO`：白边相对最终显示尺寸的比例；生成时会反算源图像素，保证不同分辨率贴纸的屏幕粗细一致。
- `STAMP_BORDER_WIDTH_RATIO`、`STAMP_HOLE_RADIUS_PX`、`STAMP_HOLE_SPACING_PX`：矩形照片的邮票边框外框、孔径与孔距。
- `MAP_STICKER_SHADOW_*`：贴纸接触阴影的颜色、模糊、偏移、形变等。
- `GROUND_TINT_*`、`TINT_DEBUG_COLORS`：地理尺寸的水彩染色层与调试色。

演示图片位于 `public/demo-memories/`，配置中的 `image` 必须与文件名完全一致：

```ts
{ latitude: 40.0012, longitude: 116.3945, image: 'my-sticker.png' },
```

水彩纹理素材在 `public/tints/`。B 的视觉参考仓库位于项目外 `../../memory-map-world-ref/memory-map-world/`，仅作只读参考，不能复制其 HTML/JS 或纳入本项目 Git。

## 贴纸边框管线

统一入口为 [`src/services/media/stickerBorder.ts`](src/services/media/stickerBorder.ts)：

- 透明 PNG（如 remove.bg 抠图）自动生成沿 alpha 轮廓的圆滑白边。
- 不透明矩形原图自动生成白色邮票边框与半圆打孔。
- 结果按 Moment id、图片地址、边框策略、显示尺寸缓存。
- 地图标记、到达动画和详情弹层都从这条管线取图；边框没生成完不会先显示裸图，避免跳变。
- `mediaService` 只负责抠图，不再生成白边，避免双重边框。

## 当前开发状态（交接）

当前分支：`photo-map-explorations-02`  
最近一次已提交基线：`6535f8c chore: 存档地图视觉与水彩纹理调试`

此后存在未提交的地图视觉、加载占位、水彩纹理、demo 图片和贴纸边框改动。最近完成、待人工验收的是：

1. 移除示例贴纸旁的黄色虚线调试框。
2. 将邮票边框参数移到 `mapDemoTuning.ts`。
3. 将白边改为按最终显示尺寸计算，并把显示尺寸加入缓存键。

## 已知构建限制

`npx tsc --noEmit -p tsconfig.app.json` 当前通过。

`npm run build` 的 TypeScript 阶段通过后，Vite 可能因 Windows 文件占用在创建 `node_modules/.vite-temp` 时失败：

```text
EPERM: operation not permitted, mkdir '.../node_modules/.vite-temp'
```

这是本机目录占用/权限问题，不是当前 TypeScript 编译错误。若再次出现，应由人工解除 `.vite-temp` 占用后再执行构建；不要自行修改系统权限、关闭安全软件或做破坏性清理。

## 验收提醒

- 真实相机拍摄、定位权限弹窗和真实 remove.bg 请求需人工验收。
- 验收贴纸时请覆盖三种来源：透明抠图、矩形 demo 图、示例贴纸；并检查到达动画首帧、地图落图和详情弹层是否边框一致。
- 不要提交或推送未经人工验收的当前改动。

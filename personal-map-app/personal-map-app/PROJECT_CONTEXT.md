# Personal Map App — Project Context

> 本文用于新 AI 或协作者快速接管。Git 和实际代码是最终事实来源；若本文与代码冲突，以当前 Git 状态和代码为准。

## 1. 产品定位与 MVP

这是一个手机竖屏网页产品：用户采集当下的照片、动态照片、录音或文字，通过一种具有叙事感的互动动画，把 Moment 放到个人地图上。

当前 MVP 范围：

- 全屏可拖动、缩放的个人地图与 Moment 贴纸。
- 记录引导、内容采集、互动中转、地图到达、持久贴纸、详情和删除。
- 采集照片/Live Photo 视频/真实录音/文本；部分媒体和位置仍允许模拟。
- 三种已注册互动：纸飞机、花苞、胶片。
- 暂不包含账号、云端同步、天气、IndexedDB 正式持久化和真实地图 API。

核心流程：`地图 → 记录引导 → 内容采集 → Transition → 定位与保存 → Arrival → 持久贴纸 → Moment 详情`。

## 2. 技术栈与启动

- React 19、Vite、TypeScript。
- 无第三方状态机、地图或大型 UI 依赖。
- 目录：`personal-map-app`。
- 安装依赖：`npm install`。
- 本地启动：`npm run dev`，默认地址 `http://127.0.0.1:4173/`。
- 生产构建：`npm run build`。

## 3. 核心目录与职责

- `src/pages`：页面展示与功能组合，不保存领域数据。
- `src/components`：通用弹层和互动选择器。
- `src/features/record`：统一 RecordFlow 和 Arrival 公共舞台。
- `src/features/capture`：CaptureDraft 编辑、录音和媒体预览生命周期。
- `src/features/moment`：Moment 集合、创建、详情、选择和删除。
- `src/features/map`：MapCanvas、地图视口和持久贴纸。
- `src/interactions`：Interaction 类型、注册表及三种独特互动表现。
- `src/services`：定位、地图投影、媒体和 Repository 适配层。
- `src/models`：CaptureDraft、Moment 等统一数据模型。
- `src/styles`：全局样式与设计变量。
- `docs/refactor-round1-baseline.md`：第一轮重构前的三种互动节奏基线。

`photo-map-explorations` 和 `photo-map-explorations02` 是只读参考，不得修改；需要复用时只能搬运到产品目录后再调整。

## 4. 核心模型和运行关系

- `CaptureDraft`：采集阶段的临时内容，包含媒体、文本和唯一的 `interactionType`。
- `RecordFlow`：产品公共控制流，以 reducer 管理 `idle / guide / capturing / transitioning / saving / arriving / completed / error`。
- `Interaction`：从注册表按 `CaptureDraft.interactionType` 取得；只负责独特互动和动画表现。
- `Transition`：接收 `draft` 和 `onContinue`，完成用户互动后通知公共流程继续。
- Moment 创建统一为 `createMoment(draft)`；定位、经纬度模糊和 Repository 保存不属于 Interaction。
- `Moment`：保存后的长期记录，包含媒体、文本、时间、原始与模糊坐标、地点、Interaction 类型和状态。
- `Arrival`：接收已保存的 `moment`，展示到达动画；公共 Arrival 舞台负责完成、退出和重播。
- `MapCanvas`：长期渲染所有 Moment 贴纸；Arrival 时暂时隐藏正在到达的正式贴纸，完成后显示。
- 点击持久贴纸由 Moment 层打开详情；删除后 Moment 集合更新，贴纸立即随之消失。

## 5. 已确定的重要决策

- 页面只展示和组合；定位、媒体、存储、地图、Moment 和记录控制流分别管理。
- Interaction 注册表是名称、说明、图标、组件和动画元数据的唯一来源。
- 不允许每种 Interaction 复制采集、定位、保存、导航、详情或贴纸逻辑。
- `interactionType` 只从 CaptureDraft 进入 Moment，禁止另传一份可能冲突的参数。
- 经纬度模糊必须发生在保存前。
- 保存阶段有同步防重复锁，避免快速重复点击创建多个 Moment。
- Moment 的持久贴纸属于 MapCanvas，不属于 Arrival 动画。
- 录音 Moment 保存 Blob 和 MIME type；详情按需创建 Object URL，并在详情卸载时释放。
- 当前阶段保持三种 Interaction 的视觉、关键帧与节奏，不做大规模 CSS 改写。

## 6. 已真实完成的功能

- 手机浏览器全屏地图、拖动、滚轮/按钮缩放和接近位置的最新层级。
- 无真实记录时的示范 Moment；创建第一条真实 Moment 后示范提示消失。
- 引导页、统一采集页、互动选择器及返回、取消、重新记录。
- 照片文件、Live Photo 视频文件、真实录音和真实文本输入。
- 纸飞机、花苞、胶片三种 Transition 与 Arrival。
- 定位后创建 Moment、到达后留下可点击贴纸、详情展示和删除入口。
- 照片/视频/录音/文本按内容存在性展示，录音可播放并显示真实时长。
- 创建多个 Moment、最新贴纸层级、防重复保存和媒体资源清理。

## 7. 当前模拟能力与技术债

- Repository 当前是内存实现；刷新后真实 Moment 消失，IndexedDB 仅预留接口。
- 地图是产品内的占位 MapCanvas 和投影服务，不是真实地图 API。
- 定位失败会使用上海附近模拟位置；城市和地点名称仍是适配层结果。
- 默认照片和未上传时的视觉素材使用教堂示例图；Live Photo 不是真实相机 Live Photo 采集协议。
- Interaction CSS 仍依赖旧 Demo 目录，这是下一阶段要解决的技术债。
- Arrival 仍包含假地图，后续要改为 MapCanvas 上的特效层。
- 部分复杂 CSS 动画无法由单一结束事件代表，仍使用集中定义的完成时长。
- 尚无自动化测试框架；当前验证以构建、浏览器流程回归和静态检查为主。

## 8. 当前 Git 状态

- 当前分支：`photo-map-explorations-02`。
- 相对 `origin/photo-map-explorations-02`：ahead 1。
- 最近 checkpoint：`b3bfd71`（`checkpoint: working personal map phase one`）。
- 工作区包含第一轮控制流重构的未提交改动，详见下一节。
- 原始只读参考目录当前没有工作区改动。

## 9. 第一轮控制流重构

实际已完成：

- 从 `App.tsx` 提取 `features/record/useRecordFlow.ts`，使用可区分 reducer 状态。
- `App.tsx` 只按 RecordFlow 状态组合页面、地图和弹层。
- `createMoment(draft, interactionType)` 已改为 `createMoment(draft)`。
- 三种 Interaction 已移除定位、保存、Repository、导航、通用返回/取消、保存反馈、详情和贴纸职责。
- 通用 Transition 控件和保存/错误反馈归入页面层。
- Arrival 完成计时、重播、退出和卸载清理集中到公共 Arrival 舞台。
- Interaction 内只保留各自独特操作、视觉状态及确有必要的动画计时。
- 已按纸飞机、花苞、胶片逐项进行 Codex 自动浏览器验证，生产构建通过。

当前控制流重构已经过 Codex 自动验证，但仍需用户最终体验验收。

## 10. 当前尚未提交的改动

- 修改：`src/App.tsx`。
- 新增：`src/features/record/useRecordFlow.ts`、`InteractionArrivalStage.tsx`。
- 修改：`src/features/moment/MomentProvider.tsx`。
- 修改：`src/interactions/types.ts` 及纸飞机、花苞、胶片组件。
- 修改：`src/pages/MapPage.tsx`、`TransitionPage.tsx`。
- 修改：`src/styles/app.css`，仅加入公共保存/错误反馈所需样式，未迁移动画 CSS。
- 新增本文档 `PROJECT_CONTEXT.md`。

## 11. 下一步（尚未开始）

1. 用户最终体验验收第一轮控制流重构，确认三种互动视觉和节奏未变化。
2. 将 Interaction CSS 与素材依赖迁入产品内部，解除对旧 Demo 目录的依赖。
3. 把 Arrival 的假地图改造成真实 MapCanvas 上方的 Interaction 特效层。

下一阶段尚未开始，不得把上述任务描述为已完成。

## 12. 新 AI 接管规则

新 AI 应先读取本文档和 `git status`，只检查当前任务相关文件，不全面 Review 项目。开始修改前确认只读 Demo 目录未被触碰，并以 Git diff 和实际代码验证本文信息。

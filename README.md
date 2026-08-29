# 个人记忆地图

这是一个围绕「拍摄—记录—抵达地图」体验开发的工作区。

## 正式项目

正式、可运行的应用代码位于 [`personal-map-app/personal-map-app`](personal-map-app/personal-map-app)。这是一个基于 React、Vite 和 TypeScript 的移动端个人记忆地图应用，包含拍摄、互动、Moment 保存与地图呈现流程。

### 本地启动

```bash
cd personal-map-app/personal-map-app
npm install
npm run dev
```

将地图及图像服务所需密钥配置在 `.env.local`；请勿提交任何密钥文件。更完整的环境变量、隐私约束和开发说明见正式项目内的 [README](personal-map-app/personal-map-app/README.md)。

## 其他目录与文件

| 路径 | 用途 |
| --- | --- |
| `A_src/` | 早期 A 端产品实现与交互代码，用于设计和功能演进参考。 |
| `a-style-lab/` | A 端静态视觉实验区，可独立打开预览 HTML 验收动效与界面样式。 |
| `memory-map-world/` | 地图世界的静态视觉原型、示例记忆素材与地图样式规范。 |
| `mobile-sticker-kit/` | 移动端贴纸生成/抠图的轻量演示工具。 |
| `photo-map-explorations/` | 照片地图转场与特效的 HTML/CSS 探索原型。 |
| `photo-sticker-lab/` | Python 图像处理与贴纸生成实验工具。 |
| 根目录的 `.md` 文档 | 产品概念、UI 设计、技术方案及协作约定。 |
| 根目录的图片、GIF、视频 | 品牌与设计参考素材，不属于正式应用源码。 |

临时浏览器验证目录（如 `.tmp-chrome-*`）、本地依赖、构建产物和环境变量文件均不应提交。

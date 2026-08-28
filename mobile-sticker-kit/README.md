# Mobile Sticker Kit

适合嵌入现有手机网页的最小实现：**浏览器上传照片 → 服务端抠图、自动校色、LUT 滤镜 → 浏览器 Canvas 制作白边贴纸 → 插入地图 DOM**。

它刻意不在手机浏览器下载或运行近 1GB 的抠图模型。网页侧无框架、无构建步骤、无第三方 npm 依赖；模型仅在部署服务端保留，并复用已有 `photo-sticker-lab` 的 BiRefNet 抠图实现。

## 文件

- `sticker-kit.js`：可直接用 `<script type="module">` 引入的浏览器模块；`make()` 会生成带白边和阴影的 PNG。
- `cutout_server.py`：开发/内网调试用的零 Web 框架 API；只接受原始图片 body，不落盘。
- `demo.html`：从选图到地图落位的可运行演示。

## 本地调试

先确保 `photo-sticker-lab/.venv` 已按它的 README 安装依赖和模型。开两个终端：

```powershell
# 终端 1：抠图 API
photo-sticker-lab\.venv\Scripts\python.exe mobile-sticker-kit\cutout_server.py

# 终端 2：提供 demo 的静态服务器（浏览器不能直接打开 file:// ES 模块）
photo-sticker-lab\.venv\Scripts\python.exe -m http.server 8080 -d mobile-sticker-kit
```

浏览器打开 `http://127.0.0.1:8080/demo.html`。手机真机调试时，将 `demo.html` 内的 `endpoint` 改成电脑局域网 IP，例如 `http://192.168.1.20:8787/api/cutout`，并用同一 Wi-Fi 访问静态页。

## 接入现有网页

在页面中添加一个图片选择器和一个 `position: relative` 的地图容器，然后：

```html
<script type="module">
  import { StickerKit } from './mobile-sticker-kit/sticker-kit.js';

  const kit = new StickerKit({ endpoint: '/api/cutout', gradeRecipe: 'paper-muted' });
  const sticker = await kit.make(fileInput.files[0]);
  kit.place(document.querySelector('#map-screen'), sticker, {
    x: 50, y: 66, width: 30,
  });
</script>
```

`make()` 的结果是 `image/png` Blob；如需持久化，可将它上传到你的存储服务，保存其地图坐标、大小和旋转。`place()` 仅负责本次 DOM 落位，不会自行存数据。

## API 契约

`POST /api/cutout?grade=paper-muted`

- 请求体：图片二进制，`Content-Type: image/jpeg`、`image/png` 等。
- 成功：`200 image/png`，经主体自动校色和 `.cube` LUT 滤镜处理的透明主体 PNG。
- 无可信主体：`422`；上传超过 15MB：`413`。
- 不保存上传文件，也不返回原始照片。

生产环境请把这个端点放在 HTTPS、认证、限流和文件大小控制之后；`cutout_server.py` 是最小调试服务，不是公网服务器。

## 取舍

默认 `gradeRecipe: 'paper-muted'` 复用原实验室的 `recipes/paper-muted.json` 与 33³ LUT；设为 `null` 可关闭校色与滤镜。白边在 Canvas 中用多方向 alpha 轮廓合成，避免逐像素读取与大依赖，适合移动端预览和导出。抠图质量由服务端模型保证；后续若必须离线，再另行加入经真机验证的小模型与 WASM/WebGPU 降级，不应把它阻塞在当前可用版本之前。

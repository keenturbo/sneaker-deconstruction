# Sneaker Deconstruction

上传一张鞋子照片，生成纯黑背景的垂直爆炸/分层视图。

## 特性
- 前端：文件上传 + 预览，Base64 请求（去掉 data: 前缀），localStorage 每日 3 次额度，随机鞋类示例背景。
- 后端：Cloudflare Functions，Gemini 多模态（文本+图片），`responseModalities:["IMAGE"]`，返回 Base64 Data URL。
- 模型：默认 `gemini-3-pro-image-preview`，可通过环境变量覆盖。

## 部署（Cloudflare Pages + Functions）
1. Fork 本仓库或直接 "Deploy to Cloudflare Pages"。
2. Pages 配置：
   - Build command：留空
   - Build output directory：`public`
3. 环境变量（必填）
   - `GEMINI_API_KEY`：需具备 Gemini 图像生成权限的 API Key。
   - `AI_MODEL_NAME`（可选）：如 `gemini-3-pro-image-preview`，未设置则默认同上。
4. 重新部署生效。

### 一键部署
[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/keenturbo/sneaker-deconstruction)

## 使用
- 打开页面，上传鞋子照片，可选输入鞋名/备注。
- 每日 3 次额度，本地计数，达上限需次日重置或自行改代码。
- 生成后可直接下载 Base64 图片。

## 后端接口
- 路径：`/api/generate`
- 方法：`POST`
- 入参 JSON：`{ image_base64: "<base64-no-prefix>", shoe_name?: "可选鞋名" }`
- 返回：`{ image_url: "data:<mime>;base64,..." }`

## 目录
- `public/index.html`：前端 UI + 额度逻辑 + 上传与预览。
- `functions/api/generate.ts`：Gemini 调用与提示词。

## 版权与责任
- 仅供学习演示，不保证生成内容的准确性与合规性。

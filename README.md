# 情绪交互式智能台灯

一个基于 React、Three.js 和 ChatGLM API 的情绪交互式智能台灯演示项目，包含 3D 数字孪生场景、灯光控制界面与 AI 驱动对话交互。

## 技术栈

- React
- Three.js
- Vite
- Express
- ChatGLM API (`glm-4.7-flash`)

## 功能说明

- AI 驱动的情绪交互：根据用户表达生成自然回复，并在需要时返回灯光调整动作
- 3D 数字孪生：实时展示台灯外观与光线状态
- 灯光控制：支持模式、亮度、色温、颜色等参数联动调节
- 流式聊天体验：前端通过 `/api/chat` 接收流式响应，并保留最近 10 轮对话上下文

## 运行说明

**前置条件：**

- Node.js 18+

1. 安装依赖：`npm install`
2. 复制 `.env.example` 为 `.env.local`
3. 在 `.env.local` 中配置 `CHATGLM_API_KEY`
4. 启动后端代理：`npm run dev:server`
5. 启动前端：`npm run dev`

## 校验

- 类型检查：`npx tsc --noEmit`
- 生产构建：`npm run build`

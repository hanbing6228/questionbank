# CFA 刷题通关

基于 [CFA刷题通关_v6](https://github.com/hanbing6228/questionbank) 设计稿实现的 **CFA Level II** 交互式刷题应用，自适应 **手机 / 平板 / 电脑**，支持 **iOS 原生壳** 与 **Vercel** 网页部署。

## 在线体验

部署到 Vercel 后访问分配的域名。本地预览：

```bash
npm install
npm run sync
npx serve public
```

## 功能

- 10 科 CFA Level II 题库（Case + 子题结构）
- 基础题 / 强化题分栏
- Mock 模拟考试（限时）
- 收藏、笔记、统计、XP 激励
- 进度本地保存（离线可用）
- 响应式：手机单列 · 平板/桌面双栏 Case 阅读区

## 开发

| 平台 | 文档 |
|------|------|
| iOS | [IOS-BUILD.md](./IOS-BUILD.md) |
| Vercel | [DEPLOY.md](./DEPLOY.md) |

```bash
npm run ios        # 打开 Xcode
npm run vercel-build
```

## 更新 CFA 题库数据

从设计稿 HTML 重新提取（默认读取 `~/Downloads/CFA刷题通关_v6/index.html`）：

```bash
npm run extract-cfa
npm run sync
```

通用 JSON/CSV 导入（备用）见 [`questions/README.md`](./questions/README.md)。

## 技术栈

- 纯 HTML / CSS / JavaScript（无构建步骤）
- [Capacitor](https://capacitorjs.com/) iOS
- [Vercel](https://vercel.com/) 静态托管

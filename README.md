# 刷题本 QuestionBank

交互式刷题应用，自适应 **手机 / 平板 / 电脑**，支持 **iOS 原生壳** 与 **Vercel** 网页部署。

## 在线体验

部署到 Vercel 后访问分配的域名。本地预览：

```bash
npm install
npm run sync
npx serve public
```

## 功能

- 单选 / 多选 / 判断题
- 顺序刷题、随机练习、错题本、收藏、模拟测验
- 答题后即时解析
- 进度本地保存（离线可用）
- 响应式布局：手机底部导航 · 平板图标侧栏 · 桌面完整侧栏

## 开发

| 平台 | 文档 |
|------|------|
| iOS | [IOS-BUILD.md](./IOS-BUILD.md) |
| Vercel | [DEPLOY.md](./DEPLOY.md) |

```bash
npm run ios        # 打开 Xcode
npm run vercel-build
```

## 自定义题库

编辑 [`questions/bank.json`](./questions/bank.json) 或 [`questions/import.csv`](./questions/import.csv)，然后：

```bash
npm run import   # 生成 web/data.js
npm run sync
```

格式说明见 [`questions/README.md`](./questions/README.md)。

## 技术栈

- 纯 HTML / CSS / JavaScript（无构建步骤）
- [Capacitor](https://capacitorjs.com/) iOS
- [Vercel](https://vercel.com/) 静态托管

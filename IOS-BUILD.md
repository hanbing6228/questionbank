# 刷题本 · iOS 构建指南

交互式刷题应用 — Capacitor 封装，自适应手机 / 平板 / 电脑。

## 功能

| 模块 | 说明 |
|------|------|
| 顺序刷题 | 按题库顺序逐题练习 |
| 随机练习 | 打乱题序巩固记忆 |
| 错题本 | 答错自动收录，可专项重练 |
| 收藏 | 标记重点题目 |
| 模拟测验 | 15 分钟限时，交卷看分 |
| 统计 | 总进度、分类完成度、正确率 |

进度保存在设备 `localStorage`，完全离线可用。

## 快速开始

```bash
cd questionbank-ios
npm install
npm run ios:add    # 首次：生成 ios/ 工程
npm run ios        # sync + 打开 Xcode
```

在 Xcode 中：选择 Team → Bundle ID `com.jiuxiao.questionbank` → Run。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run sync` | 从 `web/` 同步到 `www/` |
| `npm run cap:sync` | sync + 更新 iOS 工程 |
| `npm run ios` | 打开 Xcode |
| `npm run ios:run` | 命令行构建并运行 |
| `npm run vercel-build` | 构建 Vercel 静态产物到 `public/` |

## 更新 Web 内容

修改 `web/` 目录后：

```bash
npm run cap:sync
```

再在 Xcode 中重新 Run / Archive。

## 项目结构

```
questionbank-ios/
├── web/              # 应用源码（编辑这里）
│   ├── index.html
│   ├── styles.css
│   ├── data.js       # 题库数据
│   └── app.js        # 刷题逻辑
├── public/           # Vercel 部署目录（自动生成）
├── www/              # Capacitor 打包目录（自动生成）
└── ios/              # Xcode 工程（cap add ios 生成）
```

## 自定义题库

编辑 `web/data.js` 中的 `QUESTION_BANK`：

- `categories`：分类列表
- `questions`：题目数组，支持 `single` / `multi` / `judge`

修改后执行 `npm run sync`。

## 上架清单

- [ ] Apple Developer 签名
- [ ] App 图标：`npm run assets`（需 `resources/icon.png` 1024×1024）
- [ ] 隐私说明：纯本地应用，无网络请求，无账号

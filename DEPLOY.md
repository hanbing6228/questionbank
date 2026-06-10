# 刷题本 · Vercel 部署

## 方式一：Vercel CLI（推荐）

```bash
cd questionbank-ios
npm install
npx vercel
```

按提示链接项目。根目录已包含 `vercel.json`，会自动执行 `npm run vercel-build` 并将 `public/` 作为静态站点输出。

生产部署：

```bash
npx vercel --prod
```

## 方式二：GitHub 关联

1. 将 `questionbank-ios` 推送到 [hanbing6228/questionbank](https://github.com/hanbing6228/questionbank)
2. 在 [Vercel Dashboard](https://vercel.com) 导入该仓库
3. **Root Directory** 设为 `questionbank-ios`（若在 monorepo 内）或保持仓库根目录
4. Framework Preset：**Other**
5. Build Command：`npm run vercel-build`
6. Output Directory：`public`

## 方式三：从 PersonalWeb monorepo 部署

若整个 PersonalWeb 仓库已连 Vercel，可在 Vercel 新建项目并指定：

- Root Directory: `questionbank-ios`
- 其余配置同上

## 验证

部署完成后访问站点，检查：

- [ ] 手机宽度下底部导航显示正常
- [ ] 平板宽度侧边栏收缩为图标栏
- [ ] 桌面宽度完整侧边栏 + 双栏刷题区
- [ ] 提交答案后显示解析
- [ ] 刷新页面后进度保留（localStorage）

## 环境变量

本应用为纯静态前端，无需配置 API Key 或数据库。

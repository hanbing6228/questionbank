# 题库导入格式

运行 `npm run import` 会读取本目录并生成 `web/data.js`。

## 方式一：JSON（推荐）

编辑 `bank.json`：

```json
{
  "id": "default",
  "title": "我的题库",
  "categories": [
    { "id": "web", "name": "Web 前端", "color": "#3b82f6" }
  ],
  "questions": [
    {
      "id": "web-1",
      "category": "web",
      "type": "single",
      "stem": "题干文字",
      "options": ["A选项", "B选项", "C选项", "D选项"],
      "answer": 0,
      "explanation": "解析",
      "difficulty": 1
    }
  ]
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | 唯一题号 |
| `category` | 是 | 分类 id，需存在于 categories |
| `type` | 是 | `single` / `multi` / `judge` |
| `stem` | 是 | 题干 |
| `options` | 选择题必填 | 选项数组 |
| `answer` | 是 | 单选：索引 `0`；多选：`[0,2]`；判断：`true`/`false` |
| `explanation` | 否 | 解析 |
| `difficulty` | 否 | 1–3，默认 1 |

可新增多个 `*.json` 文件，题目会合并进同一题库。

## 方式二：CSV（Excel 导出）

参考 `import.csv`：

```csv
id,category,type,stem,optionA,optionB,optionC,optionD,answer,explanation,difficulty
csv-1,web,single,题干...,A,B,C,D,A,解析文字,1
csv-2,net,judge,判断题干,,,,,true,解析,1
csv-3,algo,multi,多选题干...,A,B,C,D,"A,C",解析,2
```

- **单选答案**：`A`–`D` 或数字索引 `0`–`3`
- **多选答案**：`A,C` 或 `0,2`（逗号分隔）
- **判断答案**：`true` / `false` / `正确` / `错误`
- 判断题 `optionA`–`optionD` 留空

## 工作流

```bash
# 1. 编辑 questions/bank.json 或 import.csv
npm run import      # 生成 web/data.js
npm run sync        # 同步到 www/ 与 public/
npm run cap:sync    # 同步到 iOS（可选）
```

Vercel 部署时会自动执行 `import` + `vercel-build`。

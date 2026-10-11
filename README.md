# 🎨 TasteCanvas · 品味广告工坊

**Qloo Agentic Hackathon 参赛项目** — 品味驱动的 AI 广告生成平台。

## 愿景

Cookie 已死，千篇一律的人口定向广告正在失效。TasteCanvas 用 Qloo 的品味图谱（taste graph）做三件事：

1. **理解品味** — 匿名品味信号 → Qloo 跨品类品牌亲和度（无需任何个人身份信息，GDPR/CCPA 合规）
2. **创意决策** — "创意总监" Agent 根据亲和度数据决定：推什么产品、用什么创意角度
3. **现场生成** — AIGC（Nano Banana 图像 + LLM 文案）为每个品味生成完全不同的广告创意

**核心 demo**：同一款产品，3 种品味，3 支完全不同的广告并排展示。

## 架构

```
                    ┌─────────────┐
  品味输入 ────────▶ │   前端画廊   │ ◀── 并排展示 3 支广告
  (3人格+自定义)     │ public/     │
                    └──────┬──────┘
                           │ POST /api/generate
                    ┌──────▼──────┐
                    │   Express   │
                    │  src/index  │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │ 创意总监Agent │ │ Qloo 层      │ │ 图像生成     │
   │ 感知→推理    │ │ mock|live   │ │ mock|live   │
   │ →生成→自检   │ │ 一行切换     │ │ 一行切换     │
   └─────────────┘ └─────────────┘ └─────────────┘
```

### Agent：四步闭环（不是单 prompt）

| 步骤 | 职责 | 当前实现 | LLM 升级点 |
|------|------|----------|-----------|
| perceive 感知 | 品味输入 → 结构化画像 | 规则归一化 | `STEP_PROMPTS.perceive` |
| reason 推理 | 选产品 + 创意角度 | 亲和度驱动的规则库 | `STEP_PROMPTS.reason` |
| generate 生成 | 画面 brief + 文案 brief | 模板生成 | `STEP_PROMPTS.generate` |
| selfCheck 自检 | 校验 brief，不合格回炉 | 规则校验，最多重试 2 次 | `STEP_PROMPTS.selfCheck` |

每步的 prompt 模板在 `src/agent/prompts.ts` 已写好，`decide*()` 函数是 LLM 调用的 drop-in 替换点，步骤 I/O 形状不变。

### Qloo 接入（一行切换）

真实 API（hackathon 版，来自官方开发者指南）：

```
GET https://hackathon.api.qloo.com/v2/insights?filter.type=urn:entity:brand&...
Header: X-Api-Key: <key>        ← 注意：是 header，不是 Bearer，不是 query 参数
```

关键规则：
- 必须是 **GET + query string**，POST + JSON body 会失败
- `filter.type` 必填（如 `urn:entity:brand`）
- hackathon key **只认** `hackathon.api.qloo.com`，staging/prod 会 401
- 推荐流程：`/search` 查实体 ID → 作为 `signal.interests.entities` 传入 `/v2/insights`

**接入步骤**：
1. 收到 key 邮件后：`cp .env.example .env`
2. 填 `QLOO_API_KEY=你的key`，改 `QLOO_MODE=live`
3. 重启服务。Mock 与真实实现都实现 `QlooClient` 接口，`src/qloo/index.ts` 是唯一的切换点，无需改其他代码。
4. 首次用 live 模式时，对照真实返回校准 `src/qloo/client.ts` 的 `mapEntity()` 字段映射（mock 已按文档形状设计）。

**Key 安全**：key 只存在服务端 `.env`（已在 `.gitignore`），永远不进前端、不进仓库、不进日志。

### 图像生成接入

`generateAdImage(brief)` 接口已定义。Mock 模式返回 SVG 占位图（带 brief 文字，画廊链路完整可验）。

切真实（Nano Banana）：`IMAGE_MODE=live` + `GEMINI_API_KEY`，按 `src/image/generator.ts` 的 TODO，用 `@google/genai` 实现——调用形状照搬 Nic 的 `awesome-nano-banana-examples` 模式：

```
model = "gemini-2.5-flash-image-preview"
response_modalities = ["IMAGE", "TEXT"]
inline_data -> 保存到 public/ads/ -> 返回 { src: "/ads/xxx.png" }
```

## 本地运行

```bash
cd ~/workspace/qloo-tastecanvas
npm install
npm run dev        # 开发模式 http://localhost:3000
# 或
npm run build && npm start
```

打开 http://localhost:3000：
- 点人格卡片 → 生成该品味的广告
- "一键生成三支广告" → 并排对比（demo 高光时刻）
- 自定义标签输入框 → 任意品味测试
- "这次生成用了什么" → Agent 四步决策轨迹

## 目录结构

```
qloo-tastecanvas/
├── src/
│   ├── index.ts              # Express 入口
│   ├── config.ts             # 环境变量配置（key 只从 env 读）
│   ├── qloo/
│   │   ├── types.ts          # Qloo 请求/响应类型（对齐真实 API）
│   │   ├── mock.ts           # Mock：同形状模拟数据
│   │   ├── client.ts         # Live：真实 hackathon API 客户端
│   │   └── index.ts          # ★ 一行切换：QLOO_MODE
│   ├── image/
│   │   └── generator.ts      # generateAdImage(brief)，mock/live 切换
│   ├── agent/
│   │   ├── types.ts          # 步骤 I/O 类型
│   │   ├── prompts.ts        # 四步 prompt 模板（LLM 就绪）
│   │   └── creativeDirector.ts # 感知→推理→生成→自检 流水线
│   ├── data/
│   │   └── personas.ts       # 3 人格 + 产品目录
│   └── routes/
│       └── api.ts            # /api/health, /personas, /generate, /generate-all
├── public/                   # 静态前端（无构建）
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .env.example              # key 占位符（不含真实值）
└── package.json
```

## 当前状态

- [x] 脚手架 + 前后端链路跑通（mock 模式）
- [ ] Qloo Key 到位 → `QLOO_MODE=live` 联调
- [ ] Nano Banana 接入 → `IMAGE_MODE=live`
- [ ] Agent 接 LLM（四步 prompt 已备好）
- [ ] 部署 live demo（Qloo 要求外部可访问）
- [ ] 录 3 分钟演示视频
- [ ] Devpost 提交（截止 10-31 11:45 北京时间）

# Cline Pass 上游控制台（cline-pass-switcher）

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%E2%89%A5%2018-green)
![Docker](https://img.shields.io/badge/docker-ready-2496ED)

Node.js 本地/服务器代理 + 网页控制台，用于 [Cline Pass](https://cline.bot/cline-pass) 订阅。
服务端 `server.js` 保持**零运行时依赖**；控制台提供两套可选前端——React + Mantine 的 SPA（需 `npm run build`），
以及内置的零依赖静态页面（未构建时自动回退，`node server.js` 依然开箱即用）：

- 🔍 **上游枚举与校验** —— 列出订阅模型背后每一条上游渠道，并一键实测哪些「✔可用 / ⏳限流 / ✘不可钉」
- 🎯 **精确钉住上游** —— 严格钉住 / 优先+回退两种模式，支持按最低成本、最快首字、最高吞吐排序
- 🧬 **多上游优先级故障转移（2026-09-06 新增）** —— 勾选多个上游即按勾选顺序逐个尝试：第一个异常（报错 / 网络失败 / 超时）自动顺切下一个，全部失败才透传错误；每次尝试有独立 120s 超时与逐次尝试明细（请求头 X-Cline-Target-Upstream: a>b 与 X-Cline-Attempts，历史与测试台展示逐次尝试路径 upstream(502) 到 upstream(200)）
- 🚫 **上游排除** —— 勾「排除」的渠道永不被使用：勾选模式下从候选中剔除；自动模式与优先+回退模式下把排除换算成 only 白名单（已知上游 - 排除项）注入，两类管道均实测生效；网关侧渠道清单更新导致白名单过期时，报错中附带的最新渠道清单会被自动学习合并
- 👥 **账号池** —— 多账号管理、手动切换、轮询均衡、逐账号连通性测试与用量统计
- 📊 **观测** —— 每条请求自动记录实际命中的渠道、背后模型、耗时（含流式）
- 🔑 **代理密钥** —— 给下游客户端发一把独立密钥，可随时在页面轮换
- 🌐 **OpenAI 兼容** —— 任何 OpenAI 客户端 / Cline 扩展把 Base URL 指向代理即可，无侵入
- 🔒 **登录门 + 路由守卫** —— React 控制台的 `/dashboard/*` 全部位于守卫之内，未通过服务端凭据校验无法进入；登录后原路返回，401 自动退回登录页
- 📊 **额度监控** —— 定时读取每个账号的 5 小时 / 本周 / 本月额度窗口，页面直接展示已用百分比与重置倒计时；复用已有 key，零额外配置

![控制台截图](docs/screenshot-top.png)

---

## 30 秒上手（本地）

```bash
git clone https://github.com/<你的用户名>/cline-pass-switcher.git
cd cline-pass-switcher
node server.js        # 仅需 Node ≥ 18，无需 npm install
```

打开 <http://127.0.0.1:3123/>，在「账号池」里添加你的 Cline Pass 账号（`sk_` 开头的 key）并保存即可。
没有 key 也能启动：页面会提示配置入口。

> 未构建前端时，服务端自动使用 `public/index.html` 里的内置零依赖控制台，功能完整。
> 想要 React + Mantine 版控制台（含路由守卫），见下一节。

### 构建 React 控制台（可选，推荐）

```bash
npm install
npm run build         # 产物输出到 dist/
node server.js        # 检测到 dist/index.html 即自动切换到 React 控制台
```

开发模式（Vite 热更新，API 自动代理到 3123）：

```bash
node server.js        # 终端 A：后端
npm run dev           # 终端 B：前端 http://localhost:5173
```

| 命令 | 作用 |
|---|---|
| `npm run dev` | Vite 开发服务器，`/api` 与 `/v1` 反代到 `127.0.0.1:3123` |
| `npm run build` | 构建到 `dist/`（不做类型检查，保证产物优先产出） |
| `npm run typecheck` | 单独跑 `tsc` 类型检查 |
| `npm start` | 启动 `server.js` |

> 两种控制台的登录凭据完全一致（服务端 `proxyKey`），升级后无需重新登录。

> Cline Pass key 从哪里来？购买 Cline Pass 订阅后，在 Cline 的账户设置里创建 API Key。
> 订阅模型 ID 均为 `cline-pass/*` 前缀（如 `cline-pass/glm-5.2`）。

客户端接入（任何 OpenAI 兼容工具）：

```
Base URL: http://127.0.0.1:3123/v1
API Key:  （在控制台「访问与安全」里设置代理密钥；本地留空 = 不鉴权）
Model:    cline-pass/glm-5.2 等
```

---

## 控制台路由与访问控制

React 控制台采用 **登录门 + 路由守卫** 结构：

| 路由 | 说明 |
|---|---|
| `/login` | 登录页。已登录用户访问会直接跳进控制台 |
| `/dashboard` | 受保护区域入口，重定向到 `/dashboard/overview` |
| `/dashboard/overview` | 概览：订阅/目录模型数、账号池、鉴权状态、最近请求 |
| `/dashboard/models` | 订阅模型：上游优先级/排除、钉住模式、探测/测试/校验 |
| `/dashboard/accounts` | 账号池：增删改、逐账号连通性测试、单账号/轮询 |
| `/dashboard/playground` | 测试台：任选模型+上游发小请求，回读实际命中渠道 |
| `/dashboard/history` | 请求历史：账号、实际上游、耗时、逐次尝试路径 |
| `/dashboard/catalog` | 模型目录：Cline 公开目录，`:free` 变体可精确钉住 |
| `/dashboard/security` | 访问与安全：代理密钥、公网地址、目录模型暴露开关 |

守卫行为：

- 未通过校验访问任意 `/dashboard/*` → 重定向到 `/login?redirect=<原路径>`，登录后**原路返回**；
- 已登录访问 `/login` → 直接跳进控制台，不再显示登录表单；
- 登录态由服务端 `GET /api/auth/session` 确认，**不是**只看 localStorage——伪造本地存储无法绕过；
- 任意 API 返回 `401`（例如服务端轮换了密钥）→ 前端立即清除凭据并退回登录页；
- 服务端未设置 `proxyKey`（鉴权关闭）时，`/api/meta` 返回 `authRequired: false`，守卫直接放行——此时登录门本就不拦截任何数据，页面会明确提示「未启用鉴权」。

服务端配套端点：

```
POST /api/auth/login     { key }  → 校验控制台凭据（免鉴权，登录入口）
GET  /api/auth/session            → 确认当前凭据是否有效（需鉴权）
GET  /api/meta                    → { authRequired, proxyBase, configured, uiMode }
```

`uiMode` 会返回 `react`（检测到 `dist/index.html`）或 `legacy`（回退内置页面），便于排查前端产物是否生效。

> SPA 路由由 `server.js` 的 fallback 兜底：`/dashboard/*` 这类前端路由在服务端没有实体文件，
> 直接刷新页面时服务端会返回 `index.html` 交给前端路由接管，不会 404。


---

## Docker 部署

### 方式 A：All-in-one（自带 Caddy 自动 HTTPS，推荐新手）

```bash
mkdir -p data && cp config.example.json data/config.json
# 编辑 data/config.json，或在启动时用环境变量注入 key

# 有域名（A 记录指向服务器，自动签发 Let's Encrypt 受信证书）：
CPASS_DOMAIN=pass.example.com docker compose -f deploy/docker-compose.all-in-one.yml up -d --build

# 只有 IP（自签证书，浏览器需手动信任一次）：
docker compose -f deploy/docker-compose.all-in-one.yml up -d --build
```

访问 `https://你的域名/`（或 `https://服务器IP/`），控制台里设置代理密钥即可对外提供服务。

### 方式 B：已有一个性化反代（nginx 门户等）

根目录的 `docker-compose.yml` 只启动应用并绑定 `127.0.0.1:3123`，由你现有的 nginx/Caddy 做 TLS：

```nginx
location / {
    proxy_pass http://127.0.0.1:3123;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_buffering off;            # 流式响应必须
    proxy_read_timeout 600s;
}
```

### 环境变量

| 变量 | 说明 |
|---|---|
| `CLINE_PASS_KEY` | 上游 Cline Pass API Key（无 config 时自动创建账号） |
| `PROXY_KEY` | 下游代理密钥（客户端访问代理的凭据） |
| `PUBLIC_BASE_URL` | 门户展示的公网代理地址，如 `https://pass.example.com` |
| `PORT` / `BIND_HOST` / `DATA_DIR` | 端口 / 绑定地址（容器内为 0.0.0.0）/ 配置目录 |

环境变量在启动时覆盖 `config.json`；此后通过控制台保存设置，会以当前生效值写回文件。

---

## 配置参考（config.json）

| 字段 | 说明 |
|---|---|
| `accounts` | 账号池：`[{ name, key, enabled }]` |
| `accountMode` | `single` 手动指定 / `roundrobin` 轮询 |
| `activeAccount` | 单账号模式下使用的下标 |
| `proxyKey` | 下游代理密钥；空 = 不鉴权 |
| `publicBaseUrl` | 公网代理地址（控制台展示用） |
| `exposeCatalog` | `true` 时代理的 `/v1/models` 会合并 Cline 公开目录模型；默认 `false` 只返回订阅模型（避免客户端模型列表被淹没） |
| `knownModels` | 订阅模型清单（控制台主表） |
| `perModel` | 每模型的钉住配置：`{ upstream, pinMode: strict|preferred, sort: cost|ttft|tps, maxRetries }` |
| `apiKey` | 旧版单 key 字段，启动时自动迁移进 `accounts` |

---

## 核心机制：Cline Pass 的两条路由管道（实测发现）

Cline Pass 订阅模型在 Cline 网关之后分成两条管道，钉住上游的写法**完全不同**：

| 管道 | 实际后端 | 识别特征 | 钉住方式 |
|---|---|---|---|
| **直连**（direct） | OpenRouter | 响应顶层带 `provider` 与真实 `model` 字段 | 顶层 `provider.only / order` |
| **规划器**（planner） | **Vercel AI Gateway** | 响应带 `provider_metadata.gateway.routing` | **`providerOptions.gateway.only / order / sort`** |

**关键发现**：规划器管道的请求由 Vercel AI Gateway 执行，请求体里的顶层 `provider.only/order` 会被 Cline 丢弃
（这也是官方 API 上"换上游不生效"的原因），但 `providerOptions.gateway` 嵌套形式会**原样透传**：

```json
{
  "model": "cline-pass/glm-5.2",
  "messages": [],
  "providerOptions": { "gateway": { "only": ["alibaba"] } }
}
```

实测响应：`finalProvider: "alibaba"`，规划器理由变为 `Provider set restricted to: alibaba`。
参考：[Vercel AI Gateway — Provider Filtering, Ordering & Sorting](https://vercel.com/docs/ai-gateway/models-and-providers/provider-filtering-and-ordering)

### 上游枚举的三种手段

1. **响应元数据回读**：规划器管道带 `canonicalSlug` / `fallbacksAvailable` / `finalProvider`；直连管道顶层 `provider` 即实际上游；
2. **假上游探测**（零 token）：带不存在的 `only:["__probe__"]` 让网关在路由层报错并列出精确的可用渠道清单（两条管道的清单**不一致**，要分别取）；
3. **OpenRouter 公开接口** `GET /api/v1/models/{slug}/endpoints`：补充上下文长度/在线率（对直连管道有直接参考意义）。

### 实测记录（2026-09）

| 实验 | 结果 |
|---|---|
| glm-5.2 + 顶层 `provider.only/ignore/order` | 全部被网关丢弃，恒选同一渠道 |
| glm-5.2 + `providerOptions.gateway.only:["alibaba"]` | ✔ `finalProvider: alibaba` |
| glm-5.2 流式 + `only:["baseten"]` | ✔ 流式同样生效 |
| glm-5.2 + `providerOptions.gateway.sort:"cost"` | ✔ 按成本重排执行顺序 |
| glm-5.3-flash（直连）+ 顶层 `provider.only:["gmicloud"]` | ✔ `provider: "GMICloud"` |
| glm-5.3-flash + `providerOptions.gateway` | ✘ 无效（直连管道只认顶层 provider 形式） |

> 管道归属由 Cline 侧决定、可能随时间变化，控制台的「探测」会刷新每个模型的管道类型与渠道清单。

---

## 控制台功能一览

React 控制台按页面组织（旧版单页控制台功能等价，卡片名对应如下）：

| 页面 | 功能 |
|---|---|
| 概览 | 订阅/目录模型数、账号池规模、鉴权状态、代理接入地址（一键复制）、账号额度、最近请求 |
| 订阅模型 | 背后模型 / 渠道数 / 最近实际渠道；渠道优先级与排除面板；严格钉住 / 优先+回退；成本·首字·吞吐排序 |
| 订阅模型 · 操作 | 探测（刷新渠道清单）、测试（单次钉住验证）、校验（全渠道实测地图）、批量探测、拉取官方最新模型 |
| 账号池 | 账号增删改、显隐密钥、逐账号连通性测试、单账号/轮询模式、用量统计、额度进度与手动刷新 |
| 测试台 | 任选模型+渠道发一条小请求，直接看网关是否采纳 |
| 请求历史 | 自动记录每条请求的账号、实际渠道、耗时、尝试序列（最近 100 条，含流式） |
| 模型目录 | Cline 公开目录模型，`:free` 变体可精确钉住 |
| 访问与安全 | 修改下游代理密钥（即时生效）、公网代理地址、目录模型暴露开关 |

> 前端轮换密钥后会同步本机保存的凭据并重新校验登录态，不会把操作者锁在控制台之外。

---

## 账号额度监控

控制台定时读取每个启用账号的订阅额度，在「概览」与「账号池」页展示 **5 小时 / 本周 / 本月** 三个窗口的已用百分比与重置倒计时。

**认证方式**：额度接口与聊天接口同源，直接复用账号池里已配置的 Cline Pass key（`sk_…`），**无需任何额外凭据**：

```
GET https://api.cline.bot/api/v1/users/me/plan/usage-limits
Authorization: Bearer sk_xxx
```

响应形如：

```json
{
  "data": {
    "limits": [
      { "type": "five_hour", "percentUsed": 3,  "resetsAt": "2026-09-18T06:18:19Z" },
      { "type": "weekly",    "percentUsed": 27, "resetsAt": "2026-09-23T05:58:58Z" },
      { "type": "monthly",   "percentUsed": 13, "resetsAt": "2026-10-16T05:58:58Z" }
    ]
  },
  "success": true
}
```

该端点只读、**不消耗订阅额度**，可以放心轮询。

| 变量 | 默认 | 说明 |
|---|---|---|
| `USAGE_POLL_MINUTES` | `5` | 额度轮询间隔（分钟），最小 1 |

服务端接口：

```
GET  /api/usage          → 各账号的额度缓存 + 轮询间隔 + 上次更新时间
POST /api/usage/refresh  → 立即刷新全部账号额度（控制台的「刷新额度」按钮）
```

额度缓存在 `metadata.json` 的 `usage` 字段，服务重启后立刻就有上一次的数据可用；账号池变更（新增或重新启用账号）时会自动为新账号拉取一次。

进度条配色：已用 <50% 绿、50–79% 橙、≥80% 红。


代理同时做了兼容性标准化：解包 Cline 的 `{"data":...}` 包装为标准 OpenAI 格式、错误统一为
`{"error":{"message":...}}`、附加 `X-Cline-Target-Upstream / X-Cline-Actual-Upstream / X-Cline-Account` 等响应头。

---

## 常见问题

**Q：为什么选了某个渠道会报 `invalid_request_error`？**
部分渠道被单独钉住时会因模型 ID 映射失败，还有渠道处于共享池限流（429）状态。点该模型行的「校验」，
把所有渠道实测一遍，下拉框会标注 ✔可用 / ⏳限流 / ✘不可钉。钉住失败的渠道会被自动学习标记。

**Q：限流的渠道还能用吗？**
能。限流是共享池的临时状态，过段时间重新「校验」即可；或改用「优先+回退」模式，限流时自动跳到其他渠道。

**Q：直接用官方 API 写 `provider.only` 为什么不生效？**
对规划器管道（走 Vercel AI Gateway 的模型）会被 Cline 网关丢弃，请改用 `providerOptions.gateway`，见上文。

**Q：两条管道的渠道清单为什么不一样？**
钉住发生在不同后端（OpenRouter vs Vercel AI Gateway），各自支持的渠道池不同，要以对应清单为准。

**Q：订阅额度怎么计？**
经代理的请求与直连官方 API 计费一致；「探测/测试/校验」会产生极小额的真实请求（每次约 0.0002 美元级）。

---

## 安全提醒

- `config.json` / `data/` 含明文密钥，已在 `.gitignore` 排除，**不要提交或分享**；
- 对外部署务必设置 `proxyKey`（控制台可随时轮换）；
- 「重试博弈」`maxRetries > 0` 时会放大请求量，注意额度消耗。

## License

[MIT](LICENSE)

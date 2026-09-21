// 与服务端 server.js 的真实响应一一对应（改后端接口时同步这里）
export type PinMode = 'strict' | 'preferred';
export type SortMode = 'cost' | 'ttft' | 'tps' | null;
export type UpstreamHealth = 'ok' | 'limited' | 'bad' | 'auth' | 'unknown';

export interface MetaInfo {
  authRequired: boolean;
  proxyBase: string;
  configured: boolean;
  uiMode?: 'react' | 'legacy';
}

export interface UpstreamDetail {
  slug: string;
  name: string;
  endpoints: number;
  context: number;
  uptime: number;
}

export interface UpstreamStatus {
  status: UpstreamHealth;
  ms?: number;
  note: string;
  checkedAt?: number;
}

export interface ModelMeta {
  ok?: boolean;
  pipeline: 'direct' | 'planner' | null;
  pinnable?: boolean;
  availableProviders?: string[];
  canonicalSlug?: string | null;
  openrouterSlug?: string | null;
  upstreamDetail?: Record<string, UpstreamDetail>;
  upstreams?: string[];
  upstreamStatus?: Record<string, UpstreamStatus>;
  tier0?: string[];
  lastProvider?: string | null;
  lastMs?: number;
  probedAt?: number;
  validatedAt?: number;
}

export interface ModelConfig {
  upstream?: string | null;
  upstreams: string[];
  exclude: string[];
  pinMode: PinMode;
  sort: SortMode;
}

export interface SubscriptionItem {
  id: string;
  config: ModelConfig;
  meta: ModelMeta | null;
}

export interface OfficialFetchInfo {
  ts: number;
  sources: string[];
  found: number;
  added: string[];
  total: number;
}

export interface ModelsResponse {
  subscription: SubscriptionItem[];
  /** 已禁用转发的模型 ID：请求命中时服务端直接返回 500 */
  disabledModels: string[];
  catalogCount: number;
  catalog: string[];
  proxyBase: string;
  officialFetch: OfficialFetchInfo | null;
}

export interface Account {
  name: string;
  key: string;
  enabled: boolean;
}

export interface AccountStats {
  requests: number;
  lastUsed: number;
  lastError: string | null;
}

/** 冷宫记录：账号命中额度上限后的冷却状态 */
export interface AccountCooldown {
  /** 释放时刻（毫秒时间戳） */
  until: number;
  /** 触发冷却的额度窗口；null 表示未识别出具体窗口 */
  window: 'monthly' | 'weekly' | 'five_hour' | null;
  reason: string;
  /** 入池来源：额度快照判定 / 请求中实时命中 / 手动 */
  source?: 'usage' | 'runtime' | 'manual';
  since: number;
  hits: number;
  lastHitAt?: number;
}

export interface AccountsResponse {
  accounts: Account[];
  mode: 'single' | 'roundrobin';
  active: number;
  stats: Record<string, AccountStats>;
  /** 账号名 -> 冷宫记录；不在其中的账号才会参与轮询 */
  cooldowns: Record<string, AccountCooldown>;
}

export interface SecurityResponse {
  proxyKey: string;
  publicBaseUrl: string;
  authRequired: boolean;
  exposeCatalog: boolean;
  proxyBase?: string;
}

export interface Attempt {
  upstream: string | null;
  status: number;
  ms: number;
  note: string;
}

export interface HistoryItem {
  ts: number;
  model: string;
  account?: string | null;
  provider?: string | null;
  canonical?: string | null;
  ms?: number;
  stream?: boolean;
  attempts?: string[];
  trace?: Attempt[];
  error?: string | null;
}

export interface HistoryResponse {
  history: HistoryItem[];
}

export interface TestResponse {
  ok: boolean;
  /** 模型已被禁用时为 true，此时不含任何上游调用 */
  disabled?: boolean;
  ms?: number;
  error?: string;
  targets?: string[];
  exclude?: string[];
  actual?: string | null;
  actualName?: string | null;
  pipeline?: 'direct' | 'planner' | null;
  pinnable?: boolean;
  canonicalSlug?: string | null;
  fallbacks?: string[];
  content?: string;
  account?: string | null;
  trace?: Attempt[];
}

export interface ValidateResponse {
  ok: boolean;
  disabled?: boolean;
  error?: string;
  summary: Record<UpstreamHealth, number>;
  results: Record<string, UpstreamStatus>;
  upstreams: string[];
}

export interface ProbeResponse {
  ok: boolean;
  disabled?: boolean;
  error?: string;
  ms?: number;
  upstreams?: string[];
  lastProvider?: string | null;
}

export interface AuthSession {
  ok: boolean;
  authRequired: boolean;
  error?: { message: string };
}

// ---------- 账号额度（/api/usage） ----------
export interface UsageLimit {
  type: string;
  percentUsed: number;
  resetsAt: string | null;
}

export interface UsagePlan {
  displayName: string | null;
  interval: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
}

export interface AccountUsage {
  ok: boolean;
  error: string | null;
  fetchedAt: number;
  limits?: UsageLimit[];
  plan?: UsagePlan;
}

export interface UsageResponse {
  usage: Record<string, AccountUsage>;
  pollMinutes: number;
  updatedAt: number;
  accounts: string[];
}

// ---------- 用量统计（/api/usage/daily） ----------
export interface DailyUsageItem {
  date: string;
  model: string;
  typeName: string;
  operation: string;
  /** 接口原始值，单位 1e-8 USD（展示时换算） */
  costUsd: number;
  promptTokens: number;
  completionTokens: number;
}

export interface AccountDailyUsage {
  ok: boolean;
  error: string | null;
  fetchedAt: number;
  start?: string;
  end?: string;
  items: DailyUsageItem[];
}

export interface DailyUsageResponse {
  accounts: string[];
  range: { start: string; end: string };
  daily: Record<string, AccountDailyUsage>;
  updatedAt: number;
  ttlMinutes: number;
}

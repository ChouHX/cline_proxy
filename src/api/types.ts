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

export interface AccountsResponse {
  accounts: Account[];
  mode: 'single' | 'roundrobin';
  active: number;
  stats: Record<string, AccountStats>;
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
  summary: Record<UpstreamHealth, number>;
  results: Record<string, UpstreamStatus>;
  upstreams: string[];
}

export interface ProbeResponse {
  ok: boolean;
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

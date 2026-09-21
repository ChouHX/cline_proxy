import type {
  AccountCooldown,
  AccountDailyUsage,
  AccountUsage,
  AccountsResponse,
  AuthSession,
  DailyUsageResponse,
  HistoryResponse,
  MetaInfo,
  ModelConfig,
  ModelsResponse,
  ProbeResponse,
  SecurityResponse,
  TestResponse,
  UsageResponse,
  ValidateResponse,
} from './types';

/** 凭据在 localStorage 的键名：与旧控制台共用，升级后无需重新登录 */
export const KEY_STORAGE = 'cps_key';

let memoryKey = '';
let onUnauthorized: (() => void) | null = null;

export function getKey(): string {
  if (memoryKey) return memoryKey;
  try {
    memoryKey = localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    memoryKey = '';
  }
  return memoryKey;
}

export function setKey(key: string): void {
  memoryKey = key;
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* 隐私模式下 localStorage 可能不可用，内存凭据仍然生效 */
  }
}

export function clearKey(): void {
  setKey('');
}

/** 注入 401 处理器：任意请求被判未授权时，由认证层统一登出并跳登录页 */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function headers(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { ...(extra || {}) };
  const key = getKey();
  if (key) h['X-Admin-Key'] = key;
  return h;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (res.status === 401) {
    // 凭据失效（服务端轮换了密钥）：清掉本地状态，交给认证层处理
    onUnauthorized?.();
    throw new ApiError('凭据无效或已失效', 401);
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok && json && typeof json === 'object' && 'error' in json) {
    const e = (json as { error: unknown }).error;
    const msg = typeof e === 'string' ? e : ((e as { message?: string })?.message ?? res.statusText);
    throw new ApiError(msg, res.status);
  }
  return json as T;
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path, { headers: headers() });
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body ?? {}),
  });
}

// ---------- 免鉴权端点 ----------
export const fetchMeta = () => fetch('/api/meta').then((r) => r.json() as Promise<MetaInfo>);

export const login = (key: string) =>
  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  }).then(async (r) => {
    const json = (await r.json().catch(() => ({}))) as AuthSession;
    return { ok: r.ok, json };
  });

// ---------- 业务端点 ----------
export const getSession = () => get<AuthSession>('/api/auth/session');
export const getModels = () => get<ModelsResponse>('/api/models');
export const getAccounts = () => get<AccountsResponse>('/api/accounts');
export const getSecurity = () => get<SecurityResponse>('/api/security');
export const getHistory = () => get<HistoryResponse>('/api/history');

// ---------- 账号额度 ----------
export const getUsage = () => get<UsageResponse>('/api/usage');

export const refreshUsage = () =>
  post<{ ok: boolean; count?: number; error?: string; usage: Record<string, AccountUsage>; updatedAt: number }>(
    '/api/usage/refresh',
  );

// ---------- 用量统计（按天） ----------
export const getDailyUsage = (start?: string, end?: string) =>
  get<DailyUsageResponse>(start && end ? `/api/usage/daily?start=${start}&end=${end}` : '/api/usage/daily');

export const refreshDailyUsage = (start: string, end: string) =>
  post<{ ok: boolean; range: { start: string; end: string }; daily: Record<string, AccountDailyUsage>; updatedAt: number }>(
    '/api/usage/daily/refresh',
    { start, end },
  );

export const saveAccounts = (payload: {
  accounts: { name: string; key: string; enabled: boolean }[];
  mode: 'single' | 'roundrobin';
  active: number;
}) => post<{ ok: boolean; accounts: number; mode: string; active: number }>('/api/accounts', payload);

export const testAccount = (key: string) =>
  post<{ ok: boolean; ms: number; model?: string; error?: string; note?: string }>('/api/accounts/test', { key });

/** 手动把账号移出冷宫；额度仍打满时下一次轮询会重新入池 */
export const clearCooldown = (name: string) =>
  post<{ ok: boolean; cooldowns: Record<string, AccountCooldown> }>('/api/accounts/cooldown', { name, clear: true });

export const saveSecurity = (payload: {
  proxyKey?: string;
  publicBaseUrl?: string;
  exposeCatalog?: boolean;
}) => post<SecurityResponse & { ok: boolean }>('/api/security', payload);

export const probeModel = (model: string) => post<ProbeResponse>('/api/probe', { model });

export const testModel = (payload: { model: string; upstream?: string | null; upstreams?: string[]; exclude?: string[] }) =>
  post<TestResponse>('/api/test', payload);

export const validateUpstreams = (model: string) =>
  post<ValidateResponse>('/api/validate-upstreams', { model });

export const savePerModel = (perModel: Record<string, Partial<ModelConfig>>) =>
  post<{ ok: boolean }>('/api/config', { perModel });

/** 覆盖式保存禁用模型列表：命中的请求不再转发，直接返回 500 */
export const saveDisabledModels = (disabledModels: string[]) =>
  post<{ ok: boolean; disabledModels: string[] }>('/api/config', { disabledModels });

export const fetchOfficialModels = () =>
  post<OfficialFetchResult & { ok: boolean }>('/api/fetch-official-models', {});

export interface OfficialFetchResult {
  sources: string[];
  found: number;
  added: string[];
  knownModels: string[];
  total: number;
  ts: number;
}

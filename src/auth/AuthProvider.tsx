import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { clearKey, fetchMeta, getKey, getSession, login, setKey, setUnauthorizedHandler } from '../api/client';
import type { MetaInfo } from '../api/types';

/**
 * authed  已登录（服务端确认凭据有效）
 * anon    需要登录但尚未通过
 * open    服务端未启用鉴权（proxyKey 为空），无登录可做，直接放行
 * loading 启动探测中
 */
export type AuthState = 'loading' | 'authed' | 'anon' | 'open';

interface AuthContextValue {
  state: AuthState;
  meta: MetaInfo | null;
  authRequired: boolean;
  signIn: (key: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => void;
  /** 重新拉取 /api/meta（改动代理地址/鉴权后同步顶栏展示），不触碰登录状态 */
  refreshMeta: () => Promise<void>;
  /** 重跑一次启动判定：轮换密钥或开关鉴权后，用它重新决定是否放行 */
  revalidate: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('loading');
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const booted = useRef(false);

  const bootstrap = useCallback(async () => {
    let info: MetaInfo;
    try {
      info = await fetchMeta();
    } catch {
      // 后端不可达：不能把用户放进 dashboard，停在登录页并提示
      setMeta(null);
      setState('anon');
      return;
    }
    setMeta(info);

    if (!info.authRequired) {
      // 服务端没开鉴权：任何人本就能拿到数据，登录页拦不住任何东西
      setState('open');
      return;
    }
    const existing = getKey();
    if (!existing) {
      setState('anon');
      return;
    }
    try {
      const s = await getSession();
      setState(s.ok || !s.authRequired ? 'authed' : 'anon');
      if (!s.ok && s.authRequired) clearKey();
    } catch {
      clearKey();
      setState('anon');
    }
  }, []);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    void bootstrap();
  }, [bootstrap]);

  // 任一 API 返回 401（例如服务端轮换了密钥）立即降级为未登录
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearKey();
      setState((prev) => (prev === 'open' ? prev : 'anon'));
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const signIn = useCallback(async (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) return { ok: false, error: '请输入访问密钥' };
    try {
      const { ok, json } = await login(trimmed);
      if (ok && json?.ok) {
        setKey(trimmed);
        setState('authed');
        return { ok: true };
      }
      return { ok: false, error: json?.error?.message || '密钥错误，请重试' };
    } catch {
      // 后端不可达时 fail-closed：不放行，也不让异常冒泡卡住按钮
      return { ok: false, error: '无法连接后端服务，请确认 server.js 正在运行' };
    }
  }, []);

  const signOut = useCallback(() => {
    clearKey();
    setState('anon');
  }, []);

  const refreshMeta = useCallback(async () => {
    try {
      setMeta(await fetchMeta());
    } catch {
      /* 后端抖动时保留旧值，不打断当前页面 */
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      meta,
      authRequired: !!meta?.authRequired,
      signIn,
      signOut,
      refreshMeta,
      revalidate: bootstrap,
    }),
    [state, meta, signIn, signOut, refreshMeta, bootstrap],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内使用');
  return ctx;
}

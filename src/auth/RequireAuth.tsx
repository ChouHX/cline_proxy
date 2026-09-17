import { Center, Loader, Stack, Text } from '@mantine/core';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

/**
 * 路由守卫：受保护路由统一包在这一层之下。
 * 未通过服务端校验的访客会被重定向到 /login，并把原目标路径放进 ?redirect=，
 * 登录成功后原路返回，不丢失用户意图。
 */
export default function RequireAuth() {
  const { state } = useAuth();
  const location = useLocation();

  if (state === 'loading') {
    return (
      <Center mih="100vh">
        <Stack align="center" gap="sm">
          <Loader size="sm" />
          <Text size="xs" c="dimmed">
            正在校验访问凭据…
          </Text>
        </Stack>
      </Center>
    );
  }

  // open 表示服务端未启用鉴权，此时登录门形同虚设，直接放行
  if (state === 'authed' || state === 'open') return <Outlet />;

  const redirect = location.pathname + location.search;
  return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
}

import {
  Alert,
  Box,
  Button,
  Center,
  Code,
  Group,
  Loader,
  Paper,
  PasswordInput,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconArrowRight, IconKey } from '@tabler/icons-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';

export default function LoginPage() {
  const { state, signIn, meta } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 只接受站内相对路径，挡住 ?redirect=http://evil 这类开放重定向
  const raw = searchParams.get('redirect') || '/dashboard';
  const redirect = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';

  useEffect(() => {
    if (state === 'authed' || state === 'open') navigate(redirect, { replace: true });
  }, [state, redirect, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await signIn(key);
      if (!r.ok) setError(r.error || '登录失败');
    } catch {
      setError('登录请求异常，请重试');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') {
    return (
      <Center mih="100vh">
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <Box
      className="grid-bg"
      mih="100vh"
      style={{ display: 'grid', placeItems: 'center', padding: 20 }}
    >
      <Paper
        className="rise-in"
        w="100%"
        maw={412}
        p="xl"
        withBorder
        style={{ boxShadow: '0 24px 60px -20px rgba(0,0,0,.75)' }}
      >
        <Stack gap="lg">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon
              size={40}
              radius="md"
              variant="gradient"
              gradient={{ from: 'control.5', to: 'control.7', deg: 135 }}
            >
              <IconKey size={20} />
            </ThemeIcon>
            <Box>
              <Title order={3} fz={17}>
                Cline Pass 上游控制台
              </Title>
              <Text fz={12} c="dimmed">
                需要访问凭据才能进入 dashboard
              </Text>
            </Box>
          </Group>

          <Alert
            variant="light"
            color="ink"
            icon={<IconAlertTriangle size={15} />}
            styles={{ message: { fontSize: 12.5, lineHeight: 1.7 } }}
          >
            此部署已启用代理密钥保护。请输入服务端 <Code>proxyKey</Code>
            （<Code>config.json</Code> 或环境变量 <Code>PROXY_KEY</Code>）以继续。
          </Alert>

          <form onSubmit={submit}>
            <Stack gap="md">
              <PasswordInput
                label="访问密钥"
                placeholder="粘贴代理密钥"
                value={key}
                onChange={(e) => {
                  setKey(e.currentTarget.value);
                  if (error) setError(null);
                }}
                autoFocus
                size="md"
                styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
              />

              {error ? (
                <Alert color="red" variant="light" py={8} styles={{ message: { fontSize: 12.5 } }}>
                  {error}
                </Alert>
              ) : null}

              <Button
                type="submit"
                size="md"
                loading={busy}
                disabled={!key.trim()}
                rightSection={busy ? null : <IconArrowRight size={16} />}
              >
                进入控制台
              </Button>
            </Stack>
          </form>

          {/* meta 为 null 说明 /api/meta 拿不到，此时后端不可达，登录必然失败 */}
          {!meta ? (
            <Text fz={11.5} c="warn.4">
              无法连接后端服务。请确认 server.js 正在运行；开发模式下还需 Vite 已把 /api 代理到后端端口。
            </Text>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
}

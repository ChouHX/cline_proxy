import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Burger,
  Code,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconBooks,
  IconCheck,
  IconCopy,
  IconFlask,
  IconGauge,
  IconHistory,
  IconLogout,
  IconRefresh,
  IconShieldLock,
  IconShieldOff,
  IconStack2,
  IconUsers,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { RefreshProvider, useRefresh } from '../data/RefreshContext';

const NAV = [
  { to: '/dashboard/overview', label: '概览', desc: '运行态与关键指标', icon: IconGauge },
  { to: '/dashboard/models', label: '订阅模型', desc: '上游优先级 / 钉住 / 校验', icon: IconStack2 },
  { to: '/dashboard/accounts', label: '账号池', desc: '多账号与轮询', icon: IconUsers },
  { to: '/dashboard/playground', label: '测试台', desc: '发真实请求验证', icon: IconFlask },
  { to: '/dashboard/history', label: '请求历史', desc: '最近 100 条记录', icon: IconHistory },
  { to: '/dashboard/catalog', label: '模型目录', desc: 'Cline 公开目录', icon: IconBooks },
  { to: '/dashboard/security', label: '访问与安全', desc: '代理密钥与暴露面', icon: IconShieldLock },
];

export default function AppLayout() {
  return (
    <RefreshProvider>
      <Shell />
    </RefreshProvider>
  );
}

function Shell() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const { pathname } = useLocation();
  const { meta, state, signOut } = useAuth();
  const { refresh } = useRefresh();
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const [copied, setCopied] = useState(false);

  const proxyBase = meta?.proxyBase || '';

  const copyProxy = async () => {
    if (!proxyBase) return;
    try {
      await navigator.clipboard.writeText(proxyBase);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      notifications.show({ message: '代理地址已复制', color: 'health' });
    } catch {
      notifications.show({ message: '复制失败，请手动选择地址', color: 'warn' });
    }
  };

  const doSignOut = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  const nav = (
    <Stack gap={4} p="sm">
      {NAV.map((item) => {
        const active = pathname === item.to;
        return (
          <NavLink
            key={item.to}
            component={Link}
            to={item.to}
            active={active}
            onClick={close}
            label={item.label}
            description={item.desc}
            leftSection={<item.icon size={18} stroke={1.7} />}
            styles={{
              root: { borderRadius: theme.defaultRadius },
              description: { fontSize: 11 },
            }}
          />
        );
      })}
    </Stack>
  );

  return (
    <AppShell
      header={{ height: 62 }}
      navbar={{ width: 232, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header
        style={{
          borderBottom: '1px solid var(--mantine-color-ink-5)',
          background: 'linear-gradient(90deg, #141821 0%, #151a26 55%, #131922 100%)',
        }}
      >
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Box
              w={30}
              h={30}
              style={{
                borderRadius: 8,
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(135deg, #4f8cff 0%, #2f68d8 100%)',
                boxShadow: '0 0 18px rgba(79,140,255,.35)',
                flex: 'none',
              }}
            >
              <Text fw={800} fz={13} c="#fff">
                CP
              </Text>
            </Box>
            <Box visibleFrom="xs">
              <Text fw={650} fz={14} lh={1.2}>
                Cline Pass 上游控制台
              </Text>
              <Text fz={11} c="dimmed" lh={1.3}>
                上游枚举 · 精确钉住 · 故障转移
              </Text>
            </Box>
          </Group>

          <Group gap="xs" wrap="nowrap">
            {proxyBase ? (
              <Tooltip label="点击复制代理 Base URL" withArrow>
                <UnstyledButton
                  onClick={copyProxy}
                  visibleFrom="md"
                  style={{
                    border: '1px solid var(--mantine-color-ink-5)',
                    borderRadius: 8,
                    padding: '5px 10px',
                    background: 'rgba(255,255,255,.02)',
                  }}
                >
                  <Group gap={6} wrap="nowrap">
                    <Code fz={11.5} c="control.3" bg="transparent">
                      {proxyBase}
                    </Code>
                    {copied ? <IconCheck size={13} color="#34c77b" /> : <IconCopy size={13} opacity={0.55} />}
                  </Group>
                </UnstyledButton>
              </Tooltip>
            ) : null}

            {state === 'open' ? (
              <Tooltip label="服务端未设置代理密钥，控制台无需登录即可访问" withArrow>
                <Badge
                  variant="light"
                  color="warn"
                  leftSection={<IconShieldOff size={12} />}
                  visibleFrom="sm"
                >
                  未启用鉴权
                </Badge>
              </Tooltip>
            ) : null}

            <Tooltip label="刷新当前页数据" withArrow>
              <ActionIcon variant="default" size="lg" onClick={refresh} aria-label="刷新">
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>

            {state === 'authed' ? (
              <Tooltip label="退出登录" withArrow>
                <ActionIcon variant="default" size="lg" onClick={doSignOut} aria-label="退出登录">
                  <IconLogout size={16} />
                </ActionIcon>
              </Tooltip>
            ) : null}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p={0}
        style={{ borderRight: '1px solid var(--mantine-color-ink-5)', background: '#131720' }}
      >
        <ScrollArea h="100%">{nav}</ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

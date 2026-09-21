import { Alert, Badge, Box, Button, Code, Group, SimpleGrid, Stack, Table, Text, UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconCopy, IconExternalLink } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { getAccounts, getHistory, getModels, getUsage } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { ErrorBlock, LoadingBlock, PageHeader, Panel } from '../components/PageKit';
import { UsagePanel } from '../components/UsageMeter';
import { useRefresh } from '../data/RefreshContext';
import { useAsyncData } from '../hooks/useAsyncData';

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <Panel p="md">
      <Text fz={11} c="dimmed" tt="uppercase" style={{ letterSpacing: '.06em' }}>
        {label}
      </Text>
      <Text fz={26} fw={700} lh={1.25} c={accent}>
        {value}
      </Text>
      {hint ? (
        <Text fz={11} c="dimmed" mt={2}>
          {hint}
        </Text>
      ) : null}
    </Panel>
  );
}

export default function OverviewPage() {
  const { token, refresh } = useRefresh();
  const { meta } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data, loading, error } = useAsyncData(async () => {
    const [models, accounts, history, usage] = await Promise.all([
      getModels(),
      getAccounts(),
      getHistory(),
      getUsage(),
    ]);
    return { models, accounts, history: history.history, usage };
  }, [token]);

  const proxyBase = data?.models.proxyBase || meta?.proxyBase || '';
  const subs = data?.models.subscription || [];
  const probed = subs.filter((s) => s.meta?.pinnable).length;
  const enabledAccounts = (data?.accounts.accounts || []).filter((a) => a.enabled !== false && a.key).length;
  const usageAccounts = data?.usage.accounts || [];

  const copy = async () => {
    if (!proxyBase) return;
    try {
      await navigator.clipboard.writeText(proxyBase);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时静默失败，地址本身已可见 */
    }
  };

  if (loading && !data) return <LoadingBlock height={240} />;
  if (error) return <ErrorBlock message={error} height={240} />;

  return (
    <Box>
      <PageHeader
        title="概览"
        description="本机代理的实时状态。把任意 OpenAI 兼容客户端的 Base URL 指向下方地址即可开始记录。"
        actions={
          <Button variant="default" size="xs" onClick={refresh}>
            刷新
          </Button>
        }
      />

      <Stack gap="md">
        {meta && !meta.configured ? (
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertTriangle size={16} />}
            title="尚未配置上游 API Key"
            styles={{ message: { fontSize: 12.5, lineHeight: 1.8 } }}
          >
            控制台可以打开，但所有请求都会失败。请到{' '}
            <Text component={Link} to="/dashboard/accounts" c="control.4" span>
              账号池
            </Text>{' '}
            添加你的 Cline Pass 账号（<Code>sk_</Code> 开头）并保存；也可通过 config.json 的{' '}
            <Code>accounts</Code> 或环境变量 <Code>CLINE_PASS_KEY</Code> 提供。
          </Alert>
        ) : null}

        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
          <Stat label="订阅模型" value={subs.length} hint={`已探测 ${probed} 个`} accent="control.4" />
          <Stat label="目录模型" value={data?.models.catalogCount ?? 0} hint="Cline 公开目录" />
          <Stat
            label="账号池"
            value={data?.accounts.accounts.length ?? 0}
            hint={`启用 ${enabledAccounts} 个 · ${
              data?.accounts.mode === 'roundrobin' ? '轮询' : '单账号'
            }`}
          />
          <Stat
            label="控制台鉴权"
            value={meta?.authRequired ? '已开启' : '未启用'}
            hint={meta?.authRequired ? '登录门生效中' : '任何人可直接访问'}
            accent={meta?.authRequired ? 'health.4' : 'warn.4'}
          />
        </SimpleGrid>

        <Panel>
          <Group justify="space-between" align="center" mb="xs" wrap="wrap">
            <Text fw={600} fz={13.5}>
              代理接入地址
            </Text>
            {proxyBase ? (
              <UnstyledButton onClick={copy}>
                <Group gap={6}>
                  <IconCopy size={14} opacity={0.6} />
                  <Text fz={11.5} c={copied ? 'health.4' : 'dimmed'}>
                    {copied ? '已复制' : '复制'}
                  </Text>
                </Group>
              </UnstyledButton>
            ) : null}
          </Group>
          <Code block fz={12.5}>
            {proxyBase || '—'}
          </Code>
          <Text fz={11.5} c="dimmed" mt={8} lh={1.8}>
            客户端 Base URL 填上面的地址（已含 <Code>/v1</Code>），API Key 填「访问与安全」里设置的代理密钥；
            本地未设密钥时留空即可。
          </Text>
        </Panel>

        <Box>
          <Group justify="space-between" align="center" mb="xs" wrap="wrap">
            <Text fw={600} fz={13.5}>
              账号额度
            </Text>
            <Text fz={11.5} c="dimmed">
              每 {data?.usage.pollMinutes ?? '—'} 分钟自动采集 · 只读查询，不消耗额度
            </Text>
          </Group>
          {usageAccounts.length === 0 ? (
            <Panel p="sm">
              <Text fz={12.5} c="dimmed">
                尚未配置启用的账号，无法采集额度。
              </Text>
            </Panel>
          ) : (
            <SimpleGrid cols={{ base: 1, xs: 2, md: 3, xl: 4 }} spacing="sm">
              {usageAccounts.map((name) => (
                <Panel key={name} p="sm">
                  <UsagePanel
                    account={name}
                    usage={data?.usage.usage[name]}
                    pollMinutes={data?.usage.pollMinutes}
                  />
                </Panel>
              ))}
            </SimpleGrid>
          )}
        </Box>

        <Panel p={0}>
          <Group justify="space-between" align="center" p="md" pb="sm">
            <Text fw={600} fz={13.5}>
              最近请求
            </Text>
            <Group gap={6}>
              <Button
                component={Link}
                to="/dashboard/history"
                size="compact-xs"
                variant="subtle"
                rightSection={<IconExternalLink size={12} />}
              >
                全部记录
              </Button>
            </Group>
          </Group>

          {!data?.history.length ? (
            <Text fz={12.5} c="dimmed" px="md" pb="md">
              暂无记录 —— 把客户端指向代理地址后这里会自动出现。
            </Text>
          ) : (
            <Table fz={12.5}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={92}>时间</Table.Th>
                  <Table.Th>模型</Table.Th>
                  <Table.Th w={130}>实际上游</Table.Th>
                  <Table.Th w={90}>耗时</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.history.slice(0, 6).map((h, i) => (
                  <Table.Tr key={`${h.ts}-${i}`}>
                    <Table.Td>
                      <Text fz={11.5} c="dimmed">
                        {new Date(h.ts).toLocaleTimeString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Code fz={11.5}>{h.model}</Code>
                    </Table.Td>
                    <Table.Td>
                      {h.provider ? (
                        <Badge variant="light" color={h.error ? 'red' : 'health'} size="sm" radius="sm">
                          {h.provider}
                        </Badge>
                      ) : (
                        <Text c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    <Table.Td>{h.ms != null ? `${h.ms} ms` : '—'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Panel>
      </Stack>
    </Box>
  );
}

import { Box, Button, Group, ScrollArea, SegmentedControl, Select, SimpleGrid, Table, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconRefresh } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { getDailyUsage, refreshDailyUsage } from '../api/client';
import StackedBar, {
  BAR_COMPLETION,
  BAR_PROMPT,
  aggregateByDay,
  aggregateByModel,
  fmtCost,
  fmtInt,
  fmtTokens,
} from '../components/DailyUsageChart';
import { ErrorBlock, LoadingBlock, PageHeader, Panel } from '../components/PageKit';
import { useRefresh } from '../data/RefreshContext';
import { useAsyncData } from '../hooks/useAsyncData';

type Preset = 'thisMonth' | 'lastMonth' | 'last7';

const iso = (d: Date) => d.toISOString().slice(0, 10);

function monthRange(offset: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return { start: iso(start), end: iso(end) };
}

function lastNDays(n: number) {
  const end = new Date();
  const start = new Date(end.getTime() - (n - 1) * 864e5);
  return { start: iso(start), end: iso(end) };
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Panel p="md">
      <Text fz={11} c="dimmed" tt="uppercase" style={{ letterSpacing: '.06em' }}>
        {label}
      </Text>
      <Text fz={22} fw={700} lh={1.3}>
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

function Legend() {
  return (
    <Group gap="sm" wrap="nowrap">
      <Group gap={5}>
        <Box w={10} h={10} style={{ borderRadius: 2, background: BAR_PROMPT }} />
        <Text fz={11} c="dimmed">
          输入
        </Text>
      </Group>
      <Group gap={5}>
        <Box w={10} h={10} style={{ borderRadius: 2, background: BAR_COMPLETION }} />
        <Text fz={11} c="dimmed">
          输出
        </Text>
      </Group>
    </Group>
  );
}

const RIGHT = { textAlign: 'right' as const };

export default function UsagePage() {
  const { token } = useRefresh();
  const [preset, setPreset] = useState<Preset>('thisMonth');
  const [account, setAccount] = useState('');
  const [busy, setBusy] = useState(false);

  const range = useMemo(() => {
    if (preset === 'lastMonth') return monthRange(-1);
    if (preset === 'last7') return lastNDays(7);
    return monthRange(0);
  }, [preset]);

  const { data, loading, error, reload } = useAsyncData(
    () => getDailyUsage(range.start, range.end),
    [token, range.start, range.end],
  );

  const accounts = data?.accounts || [];
  const current = account || accounts[0] || '';
  const dailyData = data?.daily?.[current];
  const items = dailyData?.items || [];

  const days = useMemo(() => aggregateByDay(items), [items]);
  const models = useMemo(() => aggregateByModel(items), [items]);
  const maxTotal = useMemo(() => Math.max(...days.map((d) => d.total), 1), [days]);

  const totals = useMemo(
    () =>
      days.reduce(
        (acc, d) => ({
          prompt: acc.prompt + d.prompt,
          completion: acc.completion + d.completion,
          total: acc.total + d.total,
          cost: acc.cost + d.cost,
        }),
        { prompt: 0, completion: 0, total: 0, cost: 0 },
      ),
    [days],
  );

  const manualRefresh = async () => {
    setBusy(true);
    try {
      await refreshDailyUsage(range.start, range.end);
      reload();
      notifications.show({ message: '用量统计已刷新', color: 'health' });
    } catch (e) {
      notifications.show({ message: `刷新失败：${e instanceof Error ? e.message : ''}`, color: 'red' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="用量统计"
        description="按天统计账号的 token 消耗与成本。数据来源为 Cline 用量接口，服务端缓存 30 分钟。"
        actions={
          <Button
            variant="default"
            size="xs"
            loading={busy}
            leftSection={<IconRefresh size={14} />}
            onClick={manualRefresh}
          >
            刷新统计
          </Button>
        }
      />

      <Panel mb="md" p="sm">
        <Group gap="md" wrap="wrap" align="center">
          <SegmentedControl
            size="xs"
            value={preset}
            onChange={(v) => setPreset(v as Preset)}
            data={[
              { value: 'thisMonth', label: '本月' },
              { value: 'lastMonth', label: '上月' },
              { value: 'last7', label: '近 7 天' },
            ]}
          />
          <Text fz={11.5} c="dimmed">
            {range.start} ~ {range.end}
          </Text>
          {accounts.length > 1 ? (
            <Select
              size="xs"
              w={180}
              value={current}
              onChange={(v) => setAccount(v || '')}
              data={accounts.map((a) => ({ value: a, label: a }))}
              label="账号"
              styles={{ label: { fontSize: 11 } }}
            />
          ) : null}
          {data ? (
            <Text fz={11} c="dimmed">
              上次采集 {data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : '—'} · 缓存 {data.ttlMinutes} 分钟
            </Text>
          ) : null}
        </Group>
      </Panel>

      {error ? (
        <ErrorBlock message={error} height={200} />
      ) : loading && !data ? (
        <LoadingBlock height={240} />
      ) : accounts.length === 0 ? (
        <Panel>
          <Text fz={12.5} c="dimmed">
            尚未配置启用的账号。
          </Text>
        </Panel>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md" mb="md">
            <Stat label="合计 Tokens" value={fmtTokens(totals.total)} hint={`${fmtInt(totals.total)} tokens`} />
            <Stat label="输入 Tokens" value={fmtTokens(totals.prompt)} hint={`${fmtInt(totals.prompt)} tokens`} />
            <Stat label="输出 Tokens" value={fmtTokens(totals.completion)} hint={`${fmtInt(totals.completion)} tokens`} />
            <Stat label="成本估算" value={fmtCost(totals.cost)} hint={`${days.length} 天有记录`} />
          </SimpleGrid>

          {dailyData && !dailyData.ok ? (
            <Panel mb="md">
              <Text fz={12.5} c="red.4">
                用量数据获取失败：{dailyData.error}
              </Text>
            </Panel>
          ) : null}

          {/* 图形与明细合并：每行左侧是横向柱条，右侧是对应数值 */}
          <Panel mb="md" p={0}>
            <Group justify="space-between" align="center" p="md" pb="sm" wrap="wrap" gap="sm">
              <Text fw={600} fz={13.5}>
                每日用量
              </Text>
              <Group gap="lg" wrap="wrap">
                <Legend />
                <Text fz={11} c="dimmed">
                  成本由接口原始值按 1e-8 换算，仅供参考
                </Text>
              </Group>
            </Group>
            <ScrollArea>
              <Table miw={940} fz={12.5} verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={104}>日期</Table.Th>
                    <Table.Th miw={260}>用量分布</Table.Th>
                    <Table.Th w={120} style={RIGHT}>
                      输入 tokens
                    </Table.Th>
                    <Table.Th w={110} style={RIGHT}>
                      输出 tokens
                    </Table.Th>
                    <Table.Th w={96} style={RIGHT}>
                      合计
                    </Table.Th>
                    <Table.Th w={108} style={RIGHT}>
                      成本估算
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {days.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={6}>
                        <Text fz={12.5} c="dimmed" py="sm">
                          该区间没有记录。
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    [...days].reverse().map((d) => (
                      <Table.Tr key={d.date}>
                        <Table.Td>
                          <Text className="mono" fz={11.5}>
                            {d.date}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <StackedBar
                            prompt={d.prompt}
                            completion={d.completion}
                            cost={d.cost}
                            max={maxTotal}
                            label={d.date}
                          />
                        </Table.Td>
                        <Table.Td style={RIGHT}>{fmtInt(d.prompt)}</Table.Td>
                        <Table.Td style={RIGHT}>{fmtInt(d.completion)}</Table.Td>
                        <Table.Td style={RIGHT}>
                          <Text fw={600} fz={12.5}>
                            {fmtTokens(d.total)}
                          </Text>
                        </Table.Td>
                        <Table.Td style={RIGHT}>{fmtCost(d.cost)}</Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
                {days.length ? (
                  <Table.Tfoot>
                    <Table.Tr>
                      <Table.Td>
                        <Text fw={600} fz={12}>
                          合计
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <StackedBar
                          prompt={totals.prompt}
                          completion={totals.completion}
                          cost={totals.cost}
                          max={maxTotal}
                          label="区间合计"
                          height={14}
                        />
                      </Table.Td>
                      <Table.Td style={RIGHT}>
                        <Text fw={600} fz={12}>
                          {fmtInt(totals.prompt)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={RIGHT}>
                        <Text fw={600} fz={12}>
                          {fmtInt(totals.completion)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={RIGHT}>
                        <Text fw={600} fz={12}>
                          {fmtTokens(totals.total)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={RIGHT}>
                        <Text fw={600} fz={12}>
                          {fmtCost(totals.cost)}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  </Table.Tfoot>
                ) : null}
              </Table>
            </ScrollArea>
          </Panel>

          <Panel p={0}>
            <Group justify="space-between" align="center" p="md" pb="sm" wrap="wrap" gap="sm">
              <Text fw={600} fz={13.5}>
                按模型汇总
              </Text>
              <Text fz={11} c="dimmed">
                柱条按区间内最大用量归一化
              </Text>
            </Group>
            <ScrollArea>
              <Table miw={940} fz={12.5} verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={300}>模型</Table.Th>
                    <Table.Th miw={240}>用量分布</Table.Th>
                    <Table.Th w={120} style={RIGHT}>
                      输入 tokens
                    </Table.Th>
                    <Table.Th w={110} style={RIGHT}>
                      输出 tokens
                    </Table.Th>
                    <Table.Th w={96} style={RIGHT}>
                      合计
                    </Table.Th>
                    <Table.Th w={84} style={RIGHT}>
                      占比
                    </Table.Th>
                    <Table.Th w={108} style={RIGHT}>
                      成本估算
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {models.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Text fz={12.5} c="dimmed" py="sm">
                          该区间没有记录。
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    models.map((m) => (
                      <Table.Tr key={m.model}>
                        <Table.Td>
                          <Text className="mono" fz={11.5}>
                            {m.model}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <StackedBar
                            prompt={m.prompt}
                            completion={m.completion}
                            cost={m.cost}
                            max={models[0]?.total || 1}
                            label={m.model}
                          />
                        </Table.Td>
                        <Table.Td style={RIGHT}>{fmtInt(m.prompt)}</Table.Td>
                        <Table.Td style={RIGHT}>{fmtInt(m.completion)}</Table.Td>
                        <Table.Td style={RIGHT}>
                          <Text fw={600} fz={12.5}>
                            {fmtTokens(m.total)}
                          </Text>
                        </Table.Td>
                        <Table.Td style={RIGHT}>
                          <Text fz={11.5} c="dimmed">
                            {totals.total ? ((m.total / totals.total) * 100).toFixed(1) : '0.0'}%
                          </Text>
                        </Table.Td>
                        <Table.Td style={RIGHT}>{fmtCost(m.cost)}</Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Panel>
        </>
      )}
    </Box>
  );
}

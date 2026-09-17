import {
  Badge,
  Box,
  Button,
  Code,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconRadar } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { fetchOfficialModels, getModels, probeModel, savePerModel, testModel, validateUpstreams } from '../api/client';
import type { ModelConfig, ModelsResponse, PinMode, SortMode, SubscriptionItem, TestResponse } from '../api/types';
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader, Panel } from '../components/PageKit';
import TestResultView from '../components/TestResultView';
import UpstreamPanel from '../components/UpstreamPanel';
import { sortUpstreams } from '../components/HealthBadge';
import { useRefresh } from '../data/RefreshContext';
import { useAsyncData } from '../hooks/useAsyncData';

export default function ModelsPage() {
  const { token, refresh } = useRefresh();
  const { data, loading, error, reload } = useAsyncData<ModelsResponse>(() => getModels(), [token]);

  const [subs, setSubs] = useState<SubscriptionItem[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [probingAll, setProbingAll] = useState(false);
  const [probeLabel, setProbeLabel] = useState('');
  const [fetching, setFetching] = useState(false);
  const [modal, setModal] = useState<{ model: string; result: TestResponse } | null>(null);

  useEffect(() => {
    if (data) setSubs(data.subscription);
  }, [data]);

  const isPending = (id: string) => pending.includes(id);
  const mark = (id: string, on: boolean) =>
    setPending((p) => (on ? [...p, id] : p.filter((x) => x !== id)));

  // 乐观更新：先改本地，失败再回滚重拉，避免表格整块闪一下
  const persistCfg = async (item: SubscriptionItem, next: ModelConfig) => {
    setSubs((prev) => prev.map((s) => (s.id === item.id ? { ...s, config: next } : s)));
    mark(item.id, true);
    try {
      await savePerModel({ [item.id]: next });
    } catch (e) {
      notifications.show({
        message: `${item.id} 保存失败：${e instanceof Error ? e.message : '未知错误'}`,
        color: 'red',
      });
      reload();
    } finally {
      mark(item.id, false);
    }
  };

  const toggleUpstream = (item: SubscriptionItem, kind: 'sel' | 'excl', u: string, on: boolean) => {
    let ups = [...(item.config.upstreams || [])];
    let exc = [...(item.config.exclude || [])];
    if (kind === 'sel') {
      if (on) {
        if (!ups.includes(u)) ups.push(u);
        exc = exc.filter((x) => x !== u);
      } else {
        ups = ups.filter((x) => x !== u);
      }
    } else if (on) {
      if (!exc.includes(u)) exc.push(u);
      ups = ups.filter((x) => x !== u);
    } else {
      exc = exc.filter((x) => x !== u);
    }
    void persistCfg(item, { ...item.config, upstreams: ups, exclude: exc });
  };

  const moveUpstream = (item: SubscriptionItem, u: string, dir: -1 | 1) => {
    const ups = [...(item.config.upstreams || [])];
    const i = ups.indexOf(u);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ups.length) return;
    [ups[i], ups[j]] = [ups[j], ups[i]];
    void persistCfg(item, { ...item.config, upstreams: ups });
  };

  const bulkUpstream = (item: SubscriptionItem, action: 'all' | 'clear') => {
    if (action === 'all') {
      const ups = sortUpstreams(item.meta).filter((u) => !(item.config.exclude || []).includes(u));
      void persistCfg(item, { ...item.config, upstreams: ups });
    } else {
      void persistCfg(item, { ...item.config, upstreams: [], exclude: [] });
    }
  };

  const runProbe = async (id: string) => {
    mark(id, true);
    try {
      const r = await probeModel(id);
      notifications.show({
        message: r.ok
          ? `${id} 探测完成：上游 ${r.upstreams?.length ?? 0} 个，命中 ${r.lastProvider ?? '未知'}`
          : `探测失败：${r.error || '未知错误'}`,
        color: r.ok ? 'health' : 'red',
      });
    } catch (e) {
      notifications.show({ message: `探测失败：${e instanceof Error ? e.message : ''}`, color: 'red' });
    } finally {
      mark(id, false);
      reload();
    }
  };

  const runProbeAll = async () => {
    setProbingAll(true);
    for (const s of subs) {
      setProbeLabel(`探测中 ${s.id}`);
      try {
        await probeModel(s.id);
      } catch {
        /* 单个失败不打断整批 */
      }
    }
    setProbeLabel('');
    setProbingAll(false);
    reload();
  };

  const runTest = async (item: SubscriptionItem) => {
    mark(item.id, true);
    try {
      const r = await testModel({
        model: item.id,
        upstreams: item.config.upstreams || [],
        exclude: item.config.exclude || [],
      });
      setModal({ model: item.id, result: r });
      reload();
    } catch (e) {
      notifications.show({ message: `测试失败：${e instanceof Error ? e.message : ''}`, color: 'red' });
    } finally {
      mark(item.id, false);
    }
  };

  const runValidate = async (item: SubscriptionItem) => {
    mark(item.id, true);
    notifications.show({ message: `正在校验 ${item.id} 的全部上游渠道（约 1 分钟）…`, color: 'control' });
    try {
      const r = await validateUpstreams(item.id);
      const s = r.summary || {};
      notifications.show({
        message: `校验完成：✔${s.ok ?? 0} · ⏳${s.limited ?? 0} · ✘${s.bad ?? 0} · 🔑${s.auth ?? 0} · 未判定 ${s.unknown ?? 0}`,
        color: 'health',
      });
    } catch (e) {
      notifications.show({ message: `校验失败：${e instanceof Error ? e.message : ''}`, color: 'red' });
    } finally {
      mark(item.id, false);
      reload();
    }
  };

  const runFetchOfficial = async () => {
    setFetching(true);
    try {
      const r = await fetchOfficialModels();
      notifications.show({
        message: r.added.length
          ? `检测到新模型，已并入列表：${r.added.join('、')}`
          : `清单已是最新：官方 ${r.found} 个模型均已覆盖，现有 ${r.knownModels.length} 个`,
        color: 'health',
        autoClose: 8000,
      });
      reload();
    } catch (e) {
      notifications.show({ message: `拉取失败：${e instanceof Error ? e.message : ''}`, color: 'red' });
    } finally {
      setFetching(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="订阅模型"
        description="cline-pass/* 订阅模型背后的上游渠道。勾选多个上游即按顺序逐个尝试，异常自动顺切下一个。"
        actions={
          <>
            <Button
              variant="default"
              size="xs"
              loading={fetching}
              leftSection={<IconDownload size={14} />}
              onClick={runFetchOfficial}
            >
              拉取官方最新模型
            </Button>
            <Button
              variant="light"
              size="xs"
              loading={probingAll}
              leftSection={<IconRadar size={14} />}
              onClick={runProbeAll}
            >
              {probingAll ? probeLabel || '探测中…' : '批量探测'}
            </Button>
            <Button variant="default" size="xs" onClick={refresh}>
              刷新
            </Button>
          </>
        }
      />

      {data?.officialFetch ? (
        <Text fz={11.5} c="dimmed" mb="xs">
          上次拉取官方清单 {new Date(data.officialFetch.ts).toLocaleString()}（来源{' '}
          {data.officialFetch.sources.join(' + ') || '无'}，新增 {data.officialFetch.added.length}）
        </Text>
      ) : null}

      <Paper>
        {error ? (
          <ErrorBlock message={error} />
        ) : loading && !subs.length ? (
          <LoadingBlock />
        ) : subs.length === 0 ? (
          <EmptyBlock message="暂无订阅模型，点上方「拉取官方最新模型」" />
        ) : (
          <ScrollArea>
            <Table miw={1080} fz={12.5}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>模型</Table.Th>
                  <Table.Th>背后模型</Table.Th>
                  <Table.Th>上游数</Table.Th>
                  <Table.Th>最近实际上游</Table.Th>
                  <Table.Th>上游优先级 / 排除</Table.Th>
                  <Table.Th>模式 / 排序</Table.Th>
                  <Table.Th>操作</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {subs.map((item) => {
                  const m = item.meta;
                  const busy = isPending(item.id);
                  return (
                    <Table.Tr key={item.id}>
                      <Table.Td>
                        <Code fz={12}>{item.id}</Code>
                        <Group gap={5} mt={5} wrap="wrap">
                          {m?.pinnable ? (
                            <Badge variant="light" color="health" size="xs" radius="sm">
                              可精确钉住 · {m.pipeline === 'planner' ? 'Vercel' : 'OpenRouter'}
                            </Badge>
                          ) : (
                            <Badge variant="light" color="warn" size="xs" radius="sm">
                              请先探测
                            </Badge>
                          )}
                          {m?.tier0?.length ? (
                            <Text fz={10.5} c="dimmed">
                              tier-0: {m.tier0.join(', ')}
                            </Text>
                          ) : null}
                        </Group>
                      </Table.Td>

                      <Table.Td>
                        {m?.canonicalSlug ? (
                          <Text className="mono" fz={11.5} c="dimmed">
                            {m.canonicalSlug}
                          </Text>
                        ) : (
                          <Text c="dimmed">—</Text>
                        )}
                      </Table.Td>

                      <Table.Td>{m?.upstreams?.length ?? <Text c="dimmed">—</Text>}</Table.Td>

                      <Table.Td>
                        {m?.lastProvider ? (
                          <>
                            <Badge variant="light" color="control" size="sm" radius="sm">
                              {m.lastProvider}
                            </Badge>
                            {m.lastMs ? (
                              <Text fz={10.5} c="dimmed" mt={3}>
                                {m.lastMs} ms
                              </Text>
                            ) : null}
                          </>
                        ) : (
                          <Text c="dimmed">未探测</Text>
                        )}
                      </Table.Td>

                      <Table.Td style={{ minWidth: 300 }}>
                        <UpstreamPanel
                          meta={m}
                          config={item.config}
                          disabled={busy}
                          onToggle={(kind, u, on) => toggleUpstream(item, kind, u, on)}
                          onMove={(u, dir) => moveUpstream(item, u, dir)}
                          onBulk={(a) => bulkUpstream(item, a)}
                        />
                      </Table.Td>

                      <Table.Td style={{ minWidth: 150 }}>
                        <Stack gap={5}>
                          <Select
                            size="xs"
                            disabled={busy}
                            value={item.config.pinMode || 'strict'}
                            onChange={(v) =>
                              void persistCfg(item, { ...item.config, pinMode: (v || 'strict') as PinMode })
                            }
                            data={[
                              { value: 'strict', label: '严格钉住' },
                              { value: 'preferred', label: '优先+回退' },
                            ]}
                          />
                          <Select
                            size="xs"
                            disabled={busy}
                            value={item.config.sort || ''}
                            onChange={(v) =>
                              void persistCfg(item, { ...item.config, sort: (v || null) as SortMode })
                            }
                            data={[
                              { value: '', label: '网关智能选' },
                              { value: 'cost', label: '最低成本' },
                              { value: 'ttft', label: '最快首字' },
                              { value: 'tps', label: '最高吞吐' },
                            ]}
                          />
                        </Stack>
                      </Table.Td>

                      <Table.Td>
                        <Group gap={5} wrap="nowrap">
                          <Tooltip label="用零 token 消耗的假上游请求刷新渠道清单" withArrow>
                            <Button size="compact-xs" variant="default" disabled={busy} onClick={() => runProbe(item.id)}>
                              探测
                            </Button>
                          </Tooltip>
                          <Button size="compact-xs" variant="default" disabled={busy} onClick={() => runTest(item)}>
                            测试
                          </Button>
                          <Button size="compact-xs" variant="default" disabled={busy} onClick={() => runValidate(item)}>
                            校验
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Paper>

      <Modal
        opened={!!modal}
        onClose={() => setModal(null)}
        title="测试结果"
        size="lg"
        styles={{ title: { fontWeight: 600, fontSize: 15 } }}
      >
        {modal ? <TestResultView result={modal.result} model={modal.model} /> : null}
      </Modal>

      <Panel mt="md" p="sm">
        <Text fz={11.5} c="dimmed" lh={1.8}>
          探测 / 测试 / 校验都会向上游发出极小额的真实请求（每次约 0.0002 美元级）。严格钉住模式下失败会直接报错，
          改用「优先+回退」可让网关在失败时自动落到后面的渠道。
        </Text>
      </Panel>
    </Box>
  );
}

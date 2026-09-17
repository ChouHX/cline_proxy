import { Badge, Box, Button, Code, Group, ScrollArea, Table, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { getModels, probeModel } from '../api/client';
import type { ModelsResponse } from '../api/types';
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader, Panel } from '../components/PageKit';
import { useRefresh } from '../data/RefreshContext';
import { useAsyncData } from '../hooks/useAsyncData';

const LIMIT = 400;

export default function CatalogPage() {
  const { token } = useRefresh();
  const { data, loading, error, reload } = useAsyncData<ModelsResponse>(() => getModels(), [token]);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = data?.catalog || [];
    const f = filter.trim().toLowerCase();
    const filtered = f ? list.filter((id) => id.toLowerCase().includes(f)) : list;
    return filtered.slice(0, LIMIT);
  }, [data, filter]);

  const probe = async (id: string) => {
    setBusy(id);
    try {
      const r = await probeModel(id);
      notifications.show({
        message: r.ok ? `${id} 探测完成：命中 ${r.lastProvider ?? '未知'}` : `探测失败：${r.error || ''}`,
        color: r.ok ? 'health' : 'red',
      });
      reload();
    } catch (e) {
      notifications.show({ message: `探测失败：${e instanceof Error ? e.message : ''}`, color: 'red' });
    } finally {
      setBusy(null);
    }
  };

  const subMeta = useMemo(() => {
    const m: Record<string, string | null | undefined> = {};
    for (const s of data?.subscription || []) m[s.id] = s.meta?.lastProvider ?? null;
    return m;
  }, [data]);

  return (
    <Box>
      <PageHeader
        title="模型目录"
        description="Cline 公开目录模型。:free 变体属于直连管道，可精确钉住；其余由规划器管理。"
        actions={
          <Badge variant="light" color="ink">
            共 {data?.catalogCount ?? 0} 个
          </Badge>
        }
      />

      <Group mb="sm">
        <TextInput
          size="xs"
          w={320}
          placeholder="输入过滤… 如 free / glm / anthropic"
          leftSection={<IconSearch size={14} />}
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
        />
        {rows.length === LIMIT ? (
          <Text fz={11.5} c="dimmed">
            仅显示前 {LIMIT} 条，收窄过滤条件查看更多
          </Text>
        ) : null}
      </Group>

      <Panel p={0}>
        {error ? (
          <ErrorBlock message={error} />
        ) : loading && !data ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyBlock message="无匹配模型" />
        ) : (
          <ScrollArea h="calc(100vh - 300px)">
            <Table miw={720} fz={12.5}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>模型 ID</Table.Th>
                  <Table.Th w={190}>可钉性</Table.Th>
                  <Table.Th w={150}>最近上游</Table.Th>
                  <Table.Th w={100}>操作</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((id) => {
                  const pinnable = id.includes(':free');
                  const last = subMeta[id];
                  return (
                    <Table.Tr key={id}>
                      <Table.Td>
                        <Code fz={12}>{id}</Code>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={pinnable ? 'health' : 'warn'} size="sm" radius="sm">
                          {pinnable ? ':free 可精确钉住' : '规划器管理'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {last ? (
                          <Badge variant="light" color="control" size="sm" radius="sm">
                            {last}
                          </Badge>
                        ) : (
                          <Text c="dimmed">—</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Button
                          size="compact-xs"
                          variant="default"
                          loading={busy === id}
                          onClick={() => probe(id)}
                        >
                          探测
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Panel>
    </Box>
  );
}

import { Badge, Box, Code, Group, ScrollArea, Table, Text } from '@mantine/core';
import { useState } from 'react';

import { getHistory } from '../api/client';
import type { HistoryItem } from '../api/types';
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader, Panel } from '../components/PageKit';
import { useRefresh } from '../data/RefreshContext';
import { useAsyncData } from '../hooks/useAsyncData';

const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString();

function attemptText(h: HistoryItem): string {
  const list = h.trace || h.attempts || [];
  if (!list.length) return '—';
  return list
    .map((t) =>
      typeof t === 'string' ? t : `${t.upstream || 'auto'}(${t.status === 200 ? '✔' : `✗${t.status}`}${t.ms}ms)`,
    )
    .join(' → ');
}

export default function HistoryPage() {
  const { token, refresh } = useRefresh();
  const { data, loading, error } = useAsyncData(() => getHistory(), [token]);
  const [onlyErrors, setOnlyErrors] = useState(false);

  const all = data?.history || [];
  const rows = onlyErrors ? all.filter((h) => !!h.error) : all;

  return (
    <Box>
      <PageHeader
        title="请求历史"
        description="经代理的请求自动记录实际命中的上游、背后模型、耗时与逐次尝试路径（最近 100 条，含流式）。"
        actions={
          <Group gap="xs">
            <Badge
              variant="light"
              color={onlyErrors ? 'warn' : 'ink'}
              style={{ cursor: 'pointer' }}
              onClick={() => setOnlyErrors((v) => !v)}
            >
              仅看错误
            </Badge>
            <Text fz={11.5} c="dimmed" style={{ cursor: 'pointer' }} onClick={refresh}>
              刷新
            </Text>
          </Group>
        }
      />

      <Panel p={0}>
        {error ? (
          <ErrorBlock message={error} />
        ) : loading && !all.length ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyBlock
            message={
              all.length === 0
                ? '暂无记录 —— 把客户端 Base URL 指向代理地址即可自动记录'
                : '没有失败的请求'
            }
          />
        ) : (
          <ScrollArea>
            <Table miw={1120} fz={12.5}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={96}>时间</Table.Th>
                  <Table.Th>模型</Table.Th>
                  <Table.Th w={110}>账号</Table.Th>
                  <Table.Th w={130}>实际上游</Table.Th>
                  <Table.Th>背后模型</Table.Th>
                  <Table.Th w={84}>耗时</Table.Th>
                  <Table.Th w={76}>方式</Table.Th>
                  <Table.Th>尝试序列</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((h, i) => (
                  <Table.Tr key={`${h.ts}-${i}`}>
                    <Table.Td>
                      <Text fz={11.5} c="dimmed">
                        {fmtTime(h.ts)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Code fz={11.5}>{h.model}</Code>
                    </Table.Td>
                    <Table.Td>
                      {h.account ? (
                        <Badge variant="light" color="control" size="sm" radius="sm">
                          {h.account}
                        </Badge>
                      ) : (
                        <Text c="dimmed">—</Text>
                      )}
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
                    <Table.Td>
                      <Text className="mono" fz={11.5} c="dimmed">
                        {h.canonical || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>{h.ms != null ? `${h.ms} ms` : '—'}</Table.Td>
                    <Table.Td>
                      <Text fz={11.5}>{h.stream ? '流式' : '非流式'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fz={11.5} c="dimmed">
                        {attemptText(h)}
                      </Text>
                      {h.error ? (
                        <Text fz={11} c="red.4" mt={2}>
                          {h.error}
                        </Text>
                      ) : null}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Panel>
    </Box>
  );
}

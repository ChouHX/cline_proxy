import { Box, Button, Code, Group, Select, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlayerPlay } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import { getModels, testModel } from '../api/client';
import type { ModelsResponse, TestResponse } from '../api/types';
import { PageHeader, Panel } from '../components/PageKit';
import { sortUpstreams, HEALTH_META } from '../components/HealthBadge';
import TestResultView from '../components/TestResultView';
import { useRefresh } from '../data/RefreshContext';
import { useAsyncData } from '../hooks/useAsyncData';

export default function PlaygroundPage() {
  const { token, refresh } = useRefresh();
  const { data } = useAsyncData<ModelsResponse>(() => getModels(), [token]);

  const [model, setModel] = useState('');
  const [upstream, setUpstream] = useState<string>('');
  const [result, setResult] = useState<TestResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const subs = data?.subscription || [];

  useEffect(() => {
    if (!model && subs.length) setModel(subs[0].id);
  }, [subs, model]);

  // 切换模型后旧的钉住目标多半不适用，重置回自动
  useEffect(() => {
    setUpstream('');
    setResult(null);
  }, [model]);

  const current = subs.find((s) => s.id === model);

  const upstreamOptions = useMemo(() => {
    const list = sortUpstreams(current?.meta ?? null);
    const statusMap = current?.meta?.upstreamStatus || {};
    const detailMap = current?.meta?.upstreamDetail || {};
    return [
      { value: '', label: '自动（不指定上游）' },
      ...list.map((u) => {
        const st = statusMap[u]?.status;
        const d = detailMap[u];
        const tag = st ? ` · ${HEALTH_META[st]?.label ?? ''}` : '';
        const name = d?.name ? `（${d.name}${d.endpoints > 1 ? ` ×${d.endpoints}` : ''}）` : '';
        return { value: u, label: `${u}${name}${tag}` };
      }),
    ];
  }, [current]);

  const send = async () => {
    if (!model || busy) return;
    setBusy(true);
    try {
      const r = await testModel({ model, upstreams: upstream ? [upstream] : [] });
      setResult(r);
    } catch (e) {
      notifications.show({ message: `发送失败：${e instanceof Error ? e.message : ''}`, color: 'red' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="测试台"
        description="向指定模型发一条 max_tokens=256 的小请求，直接回读网关本次实际命中的上游，验证钉住是否生效。"
        actions={
          <Button variant="default" size="xs" onClick={refresh}>
            刷新
          </Button>
        }
      />

      <Panel mb="md">
        <Stack gap="sm">
          <Group gap="sm" align="flex-end" wrap="wrap">
            <Select
              label="模型"
              size="sm"
              w={340}
              searchable
              value={model}
              onChange={(v) => setModel(v || '')}
              data={subs.map((s) => ({ value: s.id, label: s.id }))}
              placeholder={subs.length ? '选择模型' : '正在加载模型列表…'}
            />
            <Select
              label="目标上游"
              size="sm"
              w={320}
              value={upstream}
              onChange={(v) => setUpstream(v || '')}
              data={upstreamOptions}
              placeholder="自动"
            />
            <Button
              leftSection={<IconPlayerPlay size={15} />}
              loading={busy}
              disabled={!model}
              onClick={send}
              mb={1}
            >
              发送测试
            </Button>
          </Group>

          <Text fz={11.5} c="dimmed">
            目标上游留空即交给网关智能选择；选中某个渠道后，本次请求会把它作为唯一钉住目标。
          </Text>
        </Stack>
      </Panel>

      <Panel>
        {result ? (
          <TestResultView result={result} model={model} />
        ) : (
          <Text fz={12.5} c="dimmed">
            尚未发起测试。选择模型与目标上游后点「发送测试」——
            {current?.meta?.pinnable ? (
              <>
                该模型当前管道为{' '}
                <Code>{current.meta.pipeline === 'planner' ? 'planner (Vercel)' : 'direct (OpenRouter)'}</Code>
                ，可精确钉住。
              </>
            ) : (
              '该模型还未探测过，建议先在「订阅模型」页点一次「探测」拿到渠道清单。'
            )}
          </Text>
        )}
      </Panel>
    </Box>
  );
}

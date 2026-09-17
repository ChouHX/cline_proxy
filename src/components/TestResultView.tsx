import { Alert, Badge, Box, Code, Group, Stack, Text } from '@mantine/core';
import { Fragment } from 'react';

import type { Attempt, TestResponse } from '../api/types';

export function TraceLine({ trace }: { trace?: Attempt[] }) {
  if (!trace?.length) return null;
  return (
    <Group gap={5} wrap="wrap" align="center">
      <Text fz={11.5} c="dimmed">
        尝试序列：
      </Text>
      {trace.map((t, i) => (
        <Fragment key={`${t.upstream}-${i}`}>
          {i > 0 ? (
            <Text fz={11.5} c="dimmed">
              →
            </Text>
          ) : null}
          <Code
            fz={11.5}
            c={t.status === 200 ? 'health.4' : 'warn.4'}
            bg="rgba(255,255,255,.03)"
          >
            {t.upstream || 'auto'}({t.status === 200 ? '✔' : `✗${t.status}`} {t.ms}ms)
          </Code>
        </Fragment>
      ))}
    </Group>
  );
}

export default function TestResultView({ result, model }: { result: TestResponse; model: string }) {
  if (!result.ok) {
    return (
      <Stack gap="xs">
        <Alert color="red" variant="light" styles={{ message: { fontSize: 12.5 } }}>
          请求失败：{result.error || '未知错误'}
        </Alert>
        <TraceLine trace={result.trace} />
      </Stack>
    );
  }

  const targets = result.targets || [];
  const hit = !targets.length || result.actual === targets[0];
  const hitExcluded = !!result.actual && (result.exclude || []).includes(result.actual);

  const verdict = hitExcluded
    ? `排除未生效：命中了被排除的上游 ${result.actual}（该渠道可能不在本地已知清单内，或网关未遵守白名单；先「探测」刷新渠道列表再试）`
    : hit
      ? '上游匹配，选择已生效。'
      : result.actual
        ? '未命中首个目标上游：渠道可能限流或不可钉（可先「校验」检查全部渠道）；严格模式失败会直接报错，可改用「优先+回退」。'
        : '该模型响应未携带上游信息，无法回读实际上游。';

  return (
    <Stack gap="sm">
      <Group gap="xl" wrap="wrap">
        <Box>
          <Text fz={11} c="dimmed">
            模型
          </Text>
          <Text className="mono" fz={12.5}>
            {model}
          </Text>
        </Box>
        <Box>
          <Text fz={11} c="dimmed">
            目标上游
          </Text>
          <Text fz={12.5}>{targets.length ? targets.join(' → ') : '自动'}</Text>
        </Box>
        <Box>
          <Text fz={11} c="dimmed">
            实际上游
          </Text>
          <Text fz={12.5} fw={600} c={hit && !hitExcluded ? 'health.4' : 'warn.4'}>
            {result.actual || '未知'}
          </Text>
        </Box>
        <Box>
          <Text fz={11} c="dimmed">
            耗时
          </Text>
          <Text fz={12.5}>{result.ms ?? '—'} ms</Text>
        </Box>
      </Group>

      <TraceLine trace={result.trace} />

      <Alert
        variant="light"
        color={hitExcluded || !hit ? 'warn' : 'health'}
        styles={{ message: { fontSize: 12.5, lineHeight: 1.7 } }}
      >
        {verdict}
      </Alert>

      <Group gap="xs" wrap="wrap">
        <Badge variant="light" color="ink" size="sm">
          管道：{result.pipeline === 'direct' ? '直连 (OpenRouter)' : result.pipeline === 'planner' ? '规划器 (Vercel)' : '未知'}
        </Badge>
        {result.canonicalSlug ? (
          <Badge variant="light" color="ink" size="sm" className="mono">
            背后模型：{result.canonicalSlug}
          </Badge>
        ) : null}
        {result.account ? (
          <Badge variant="light" color="ink" size="sm">
            账号：{result.account}
          </Badge>
        ) : null}
      </Group>

      <Box>
        <Text fz={11} c="dimmed" mb={2}>
          模型回复
        </Text>
        <Code block fz={11.5}>
          {result.content || '(空)'}
        </Code>
      </Box>
    </Stack>
  );
}

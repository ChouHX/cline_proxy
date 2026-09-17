import { Badge, Text, Tooltip } from '@mantine/core';
import type { UpstreamHealth, UpstreamStatus } from '../api/types';

export const HEALTH_META: Record<UpstreamHealth, { label: string; color: string; short: string }> = {
  ok: { label: '可用', color: 'health', short: '✔' },
  limited: { label: '限流', color: 'warn', short: '⏳' },
  bad: { label: '不可钉', color: 'red', short: '✘' },
  auth: { label: 'key 错', color: 'red', short: '🔑' },
  unknown: { label: '未判定', color: 'gray', short: '·' },
};

/** 校验状态排序权重：可用优先，不可钉置底 */
export const ST_RANK: Record<UpstreamHealth, number> = {
  ok: 0,
  limited: 1,
  unknown: 2,
  auth: 3,
  bad: 4,
};

export function sortUpstreams(meta: { upstreams?: string[]; upstreamStatus?: Record<string, UpstreamStatus> } | null): string[] {
  const stMap = meta?.upstreamStatus || {};
  return [...(meta?.upstreams || [])].sort(
    (a, b) => (ST_RANK[stMap[a]?.status] ?? 2) - (ST_RANK[stMap[b]?.status] ?? 2),
  );
}

export function HealthBadge({ status, excluded }: { status?: UpstreamStatus | null; excluded?: boolean }) {
  if (excluded) {
    return (
      <Badge variant="light" color="red" size="sm" radius="sm">
        已排除
      </Badge>
    );
  }
  if (!status?.status) return <Text fz={11.5} c="dimmed">—</Text>;
  const m = HEALTH_META[status.status] ?? HEALTH_META.unknown;
  const tip = [status.ms ? `${status.ms} ms` : null, status.note].filter(Boolean).join(' · ');
  return (
    <Tooltip label={tip || m.label} withArrow multiline maw={360} disabled={!tip}>
      <Badge variant="light" color={m.color} size="sm" radius="sm">
        {m.label}
      </Badge>
    </Tooltip>
  );
}

import { Badge, Box, Group, Progress, Stack, Text, Tooltip } from '@mantine/core';
import type { AccountUsage } from '../api/types';

const WINDOW_LABEL: Record<string, string> = {
  five_hour: '5 小时',
  weekly: '本周',
  monthly: '本月',
};

export const windowLabel = (type: string) => WINDOW_LABEL[type] || type;

/** 已用百分比 → 语义色：过半预警，八成告急 */
export function usageColor(percent: number): string {
  if (percent >= 80) return 'red';
  if (percent >= 50) return 'warn';
  return 'health';
}

/** 相对重置时间，比原始 ISO 时间戳直观 */
export function untilText(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return '';
  if (ms <= 0) return '即将重置';
  const minutes = Math.round(ms / 60e3);
  if (minutes < 60) return `${Math.max(1, minutes)} 分钟后重置`;
  const hours = Math.floor(ms / 3600e3);
  if (hours < 48) return `${hours} 小时后重置`;
  return `${Math.round(hours / 24)} 天后重置`;
}

const fmtTime = (ts: number) => (ts ? new Date(ts).toLocaleTimeString() : '—');

function FailedBadge({ error }: { error: string | null }) {
  return (
    <Tooltip label={error || '获取失败'} withArrow multiline maw={340}>
      <Badge variant="light" color="red" size="sm" radius="sm">
        额度获取失败
      </Badge>
    </Tooltip>
  );
}

/** 表格内的紧凑形态：每个窗口一条细进度 + 百分比 */
export function UsageBadges({ usage }: { usage?: AccountUsage | null }) {
  if (!usage) {
    return (
      <Text fz={11} c="dimmed">
        待采集
      </Text>
    );
  }
  if (!usage.ok) return <FailedBadge error={usage.error} />;
  const limits = usage.limits || [];
  if (!limits.length) {
    return (
      <Text fz={11} c="dimmed">
        —
      </Text>
    );
  }
  return (
    <Stack gap={4}>
      {limits.map((l) => (
        <Group key={l.type} gap={6} wrap="nowrap">
          <Text fz={10.5} c="dimmed" w={44} style={{ flex: 'none' }}>
            {windowLabel(l.type)}
          </Text>
          <Progress.Root size={6} w={64} radius="xl" style={{ flex: 'none' }}>
            <Progress.Section value={Math.min(100, Math.max(0, l.percentUsed))} color={usageColor(l.percentUsed)} />
          </Progress.Root>
          <Text fz={10.5} c={`${usageColor(l.percentUsed)}.4`} w={36} ta="right" style={{ flex: 'none' }}>
            {l.percentUsed}%
          </Text>
        </Group>
      ))}
    </Stack>
  );
}

/** 卡片内的紧凑形态：每个窗口一行（标签 + 细进度条 + 百分比 + 重置倒计时） */
export function UsagePanel({
  usage,
  account,
  pollMinutes,
}: {
  usage?: AccountUsage | null;
  account?: string;
  pollMinutes?: number;
}) {
  if (!usage) {
    return (
      <Text fz={11.5} c="dimmed" lh={1.6}>
        额度数据尚未采集完成，稍候会自动出现{pollMinutes ? `（每 ${pollMinutes} 分钟刷新一次）` : ''}。
      </Text>
    );
  }
  if (!usage.ok) {
    return (
      <Group gap={8} wrap="nowrap" align="center">
        <FailedBadge error={usage.error} />
        <Text fz={10.5} c="dimmed" truncate>
          {fmtTime(usage.fetchedAt)} 尝试
        </Text>
      </Group>
    );
  }

  const limits = usage.limits || [];
  return (
    <Stack gap={7}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap={8}>
        <Box style={{ minWidth: 0 }}>
          <Text fw={600} fz={12.5} lh={1.35} truncate>
            {account || '账号'}
          </Text>
          {usage.plan?.displayName ? (
            <Text fz={10.5} c="dimmed" lh={1.35} truncate>
              {usage.plan.displayName}
            </Text>
          ) : null}
        </Box>
        {usage.plan?.canceledAt ? (
          <Tooltip
            label={`已于 ${new Date(usage.plan.canceledAt).toLocaleDateString()} 取消，到期后不再续费`}
            withArrow
          >
            <Badge variant="light" color="warn" size="xs" radius="sm" style={{ flex: 'none' }}>
              已取消续费
            </Badge>
          </Tooltip>
        ) : null}
      </Group>

      {limits.length === 0 ? (
        <Text fz={11.5} c="dimmed">
          该账号未返回额度窗口。
        </Text>
      ) : (
        <Stack gap={5}>
          {limits.map((l) => {
            const color = usageColor(l.percentUsed);
            return (
              <Group key={l.type} gap={8} wrap="nowrap" align="center">
                <Text fz={11.5} c="dimmed" w={42} style={{ flex: 'none' }}>
                  {windowLabel(l.type)}
                </Text>
                <Progress
                  value={Math.min(100, Math.max(0, l.percentUsed))}
                  color={color}
                  size={6}
                  radius="xl"
                  style={{ flex: 1, minWidth: 48 }}
                />
                <Text fz={11} fw={600} c={`${color}.4`} w={34} ta="right" style={{ flex: 'none' }}>
                  {l.percentUsed}%
                </Text>
                <Text fz={10} c="dimmed" w={66} ta="right" truncate style={{ flex: 'none' }}>
                  {untilText(l.resetsAt) || '—'}
                </Text>
              </Group>
            );
          })}
        </Stack>
      )}

      <Text fz={10} c="dimmed">
        更新于 {fmtTime(usage.fetchedAt)}
        {pollMinutes ? ` · 每 ${pollMinutes} 分钟刷新` : ''}
      </Text>
    </Stack>
  );
}

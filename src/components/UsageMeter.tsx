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

/** 卡片内的详细形态：大片进度条 + 重置倒计时 + 套餐信息 */
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
      <Text fz={12} c="dimmed">
        额度数据尚未采集完成，稍候会自动出现{pollMinutes ? `（每 ${pollMinutes} 分钟刷新一次）` : ''}。
      </Text>
    );
  }
  if (!usage.ok) {
    return (
      <Stack gap={6}>
        <FailedBadge error={usage.error} />
        <Text fz={11} c="dimmed">
          上一次尝试：{fmtTime(usage.fetchedAt)}
        </Text>
      </Stack>
    );
  }

  const limits = usage.limits || [];
  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <Box style={{ minWidth: 0 }}>
          <Text fw={600} fz={14} truncate>
            {account || '账号'}
          </Text>
          {usage.plan?.displayName ? (
            <Text fz={11.5} c="dimmed" truncate>
              {usage.plan.displayName}
            </Text>
          ) : null}
        </Box>
        {usage.plan?.canceledAt ? (
          <Tooltip
            label={`已于 ${new Date(usage.plan.canceledAt).toLocaleDateString()} 取消，到期后不再续费`}
            withArrow
          >
            <Badge variant="light" color="warn" size="sm" radius="sm" style={{ flex: 'none' }}>
              已取消续费
            </Badge>
          </Tooltip>
        ) : null}
      </Group>

      {limits.length === 0 ? (
        <Text fz={12} c="dimmed">
          该账号未返回额度窗口。
        </Text>
      ) : (
        <Stack gap="sm">
          {limits.map((l) => {
            const color = usageColor(l.percentUsed);
            return (
              <Box key={l.type}>
                <Group justify="space-between" mb={4} gap="sm" wrap="nowrap">
                  <Text fz={12.5} fw={500}>
                    {windowLabel(l.type)}
                  </Text>
                  <Group gap="sm" wrap="nowrap">
                    <Text fz={12.5} fw={600} c={`${color}.4`}>
                      已用 {l.percentUsed}%
                    </Text>
                    <Text fz={11} c="dimmed">
                      {untilText(l.resetsAt)}
                    </Text>
                  </Group>
                </Group>
                <Progress value={Math.min(100, Math.max(0, l.percentUsed))} color={color} size="md" radius="xl" />
              </Box>
            );
          })}
        </Stack>
      )}

      <Text fz={10.5} c="dimmed">
        更新于 {fmtTime(usage.fetchedAt)}
        {pollMinutes ? ` · 每 ${pollMinutes} 分钟刷新` : ''}
      </Text>
    </Stack>
  );
}

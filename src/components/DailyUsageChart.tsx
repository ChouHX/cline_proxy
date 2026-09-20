import { Box, Group, Stack, Text, Tooltip } from '@mantine/core';
import type { DailyUsageItem } from '../api/types';

/** 成本字段的接口原始单位是 1e-8 USD */
export const COST_UNIT = 1e8;

export const fmtCost = (raw: number) => `$${(raw / COST_UNIT).toFixed(4)}`;

export function fmtTokens(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

export const fmtInt = (n: number) => n.toLocaleString('en-US');

export interface DayAgg {
  date: string;
  prompt: number;
  completion: number;
  total: number;
  cost: number;
}

export interface ModelAgg {
  model: string;
  prompt: number;
  completion: number;
  total: number;
  cost: number;
  calls: number;
}

export function aggregateByDay(items: DailyUsageItem[]): DayAgg[] {
  const map = new Map<string, DayAgg>();
  for (const it of items) {
    const cur = map.get(it.date) || { date: it.date, prompt: 0, completion: 0, total: 0, cost: 0 };
    cur.prompt += it.promptTokens;
    cur.completion += it.completionTokens;
    cur.total += it.promptTokens + it.completionTokens;
    cur.cost += it.costUsd;
    map.set(it.date, cur);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function aggregateByModel(items: DailyUsageItem[]): ModelAgg[] {
  const map = new Map<string, ModelAgg>();
  for (const it of items) {
    const key = it.model || '(未知)';
    const cur = map.get(key) || { model: key, prompt: 0, completion: 0, total: 0, cost: 0, calls: 0 };
    cur.prompt += it.promptTokens;
    cur.completion += it.completionTokens;
    cur.total += it.promptTokens + it.completionTokens;
    cur.cost += it.costUsd;
    cur.calls += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

const PROMPT_COLOR = 'linear-gradient(90deg, #2f68d8 0%, #4f8cff 100%)';
const COMPLETION_COLOR = 'linear-gradient(90deg, #1a8752 0%, #34c77b 100%)';

/** 每天一行：输入/输出堆叠条形 + 合计 + 成本 */
export default function DailyUsageChart({ days }: { days: DayAgg[] }) {
  if (!days.length) {
    return (
      <Text fz={12.5} c="dimmed">
        该区间没有用量记录。
      </Text>
    );
  }
  const max = Math.max(...days.map((d) => d.prompt + d.completion), 1);

  return (
    <Stack gap={7}>
      <Group gap="sm" wrap="nowrap">
        <Text w={62} fz={11} c="dimmed" style={{ flex: 'none' }}>
          日期
        </Text>
        <Box flex={1} />
        <Text w={72} fz={11} c="dimmed" ta="right" style={{ flex: 'none' }}>
          合计
        </Text>
        <Text w={82} fz={11} c="dimmed" ta="right" style={{ flex: 'none' }}>
          成本估算
        </Text>
      </Group>

      {days.map((d) => {
        const pw = (d.prompt / max) * 100;
        const cw = (d.completion / max) * 100;
        return (
          <Group key={d.date} gap="sm" wrap="nowrap">
            <Text w={62} fz={11.5} c="dimmed" style={{ flex: 'none' }}>
              {d.date.slice(5)}
            </Text>
            <Box flex={1} style={{ minWidth: 0 }}>
              <Tooltip
                withArrow
                multiline
                maw={340}
                label={
                  <>
                    <div>{d.date}</div>
                    <div>输入 {fmtInt(d.prompt)} tokens</div>
                    <div>输出 {fmtInt(d.completion)} tokens</div>
                    <div>合计 {fmtInt(d.total)} tokens</div>
                    <div>成本 {fmtCost(d.cost)}</div>
                  </>
                }
              >
                <Box
                  h={16}
                  style={{
                    display: 'flex',
                    gap: 1,
                    borderRadius: 3,
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,.035)',
                  }}
                >
                  <Box style={{ width: `${pw}%`, background: PROMPT_COLOR, transition: 'width .3s ease' }} />
                  <Box style={{ width: `${cw}%`, background: COMPLETION_COLOR, transition: 'width .3s ease' }} />
                </Box>
              </Tooltip>
            </Box>
            <Text w={72} fz={11.5} ta="right" style={{ flex: 'none' }}>
              {fmtTokens(d.total)}
            </Text>
            <Text w={82} fz={11.5} ta="right" c="dimmed" style={{ flex: 'none' }}>
              {fmtCost(d.cost)}
            </Text>
          </Group>
        );
      })}

      <Group gap="md" mt={2} wrap="wrap">
        <Group gap={6}>
          <Box w={11} h={11} style={{ borderRadius: 3, background: PROMPT_COLOR }} />
          <Text fz={11} c="dimmed">
            输入 tokens
          </Text>
        </Group>
        <Group gap={6}>
          <Box w={11} h={11} style={{ borderRadius: 3, background: COMPLETION_COLOR }} />
          <Text fz={11} c="dimmed">
            输出 tokens
          </Text>
        </Group>
      </Group>
    </Stack>
  );
}

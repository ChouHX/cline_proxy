import { Box, Tooltip } from '@mantine/core';
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

export const BAR_PROMPT = 'linear-gradient(90deg, #2f68d8 0%, #4f8cff 100%)';
export const BAR_COMPLETION = 'linear-gradient(90deg, #1a8752 0%, #34c77b 100%)';

/**
 * 横向堆叠条：左段=输入 tokens，右段=输出 tokens，总长按区间最大值归一化。
 * 放进表格单元格里，让「图」与「明细」处在同一行，不必上下对照。
 */
export default function StackedBar({
  prompt,
  completion,
  cost,
  max,
  label,
  height = 18,
}: {
  prompt: number;
  completion: number;
  cost: number;
  max: number;
  label: string;
  height?: number;
}) {
  const pw = max > 0 ? (prompt / max) * 100 : 0;
  const cw = max > 0 ? (completion / max) * 100 : 0;
  return (
    <Tooltip
      withArrow
      multiline
      maw={320}
      label={
        <>
          <div>{label}</div>
          <div>输入 {fmtInt(prompt)} tokens</div>
          <div>输出 {fmtInt(completion)} tokens</div>
          <div>合计 {fmtInt(prompt + completion)} tokens</div>
          <div>成本 {fmtCost(cost)}</div>
        </>
      }
    >
      <Box
        h={height}
        w="100%"
        style={{
          display: 'flex',
          gap: 1,
          minWidth: 90,
          borderRadius: 3,
          overflow: 'hidden',
          background: 'rgba(255,255,255,.035)',
        }}
      >
        <Box style={{ width: `${pw}%`, background: BAR_PROMPT, transition: 'width .3s ease' }} />
        <Box style={{ width: `${cw}%`, background: BAR_COMPLETION, transition: 'width .3s ease' }} />
      </Box>
    </Tooltip>
  );
}

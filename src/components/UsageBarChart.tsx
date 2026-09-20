import { Box, Group, Text, Tooltip } from '@mantine/core';

export interface BarDatum {
  /** X 轴刻度标签，如 09-16 */
  label: string;
  /** tooltip 里的完整标题，如 2026-09-16 */
  fullLabel: string;
  prompt: number;
  completion: number;
  total: number;
  /** 已格式化好的成本文本 */
  costText: string;
  /** tooltip 追加行（按模型汇总时用来显示占比等） */
  extra?: string;
}

/**
 * 竖向柱状图：X 轴为时间刻度，Y 轴为用量（tokens）。
 * 每根柱子自下而上堆叠：输入在下、输出在上；柱高按 Y 轴最大值归一化。
 */
export default function UsageBarChart({
  data,
  max,
  height = 220,
  fmtValue,
  fmtTooltipValue,
}: {
  data: BarDatum[];
  /** Y 轴上限（调用方保证 >= 所有 total） */
  max: number;
  height?: number;
  fmtValue: (n: number) => string;
  fmtTooltipValue: (n: number) => string;
}) {
  const safeMax = max > 0 ? max : 1;
  // X 轴标签过密时按间隔显示，避免糊成一片
  const labelStep = Math.ceil(data.length / 16) || 1;

  const grid = [
    { pos: '0%', value: safeMax },
    { pos: '25%', value: safeMax * 0.75 },
    { pos: '50%', value: safeMax * 0.5 },
    { pos: '75%', value: safeMax * 0.25 },
  ];

  return (
    <Box>
      <Group gap={0} wrap="nowrap" align="stretch">
        {/* Y 轴刻度 */}
        <Box w={66} style={{ position: 'relative', height, flex: 'none' }}>
          {grid.map((g) => (
            <Text
              key={g.pos}
              fz={10}
              c="dimmed"
              style={{ position: 'absolute', top: g.pos, right: 10, transform: 'translateY(-50%)' }}
            >
              {fmtValue(g.value)}
            </Text>
          ))}
          <Text fz={10} c="dimmed" style={{ position: 'absolute', bottom: 0, right: 10 }}>
            0
          </Text>
        </Box>

        {/* 绘图区 */}
        <Box flex={1} style={{ position: 'relative', height, minWidth: 0 }}>
          {grid.map((g) => (
            <Box
              key={g.pos}
              style={{
                position: 'absolute',
                top: g.pos,
                left: 0,
                right: 0,
                borderTop: '1px dashed rgba(255,255,255,.07)',
              }}
            />
          ))}
          <Box
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              borderTop: '1px solid var(--mantine-color-ink-5)',
            }}
          />

          <Group gap={4} wrap="nowrap" align="stretch" h="100%" px={6}>
            {data.map((d) => {
              const totalPct = (d.total / safeMax) * 100;
              const cPct = d.total > 0 ? (d.completion / d.total) * 100 : 0;
              const pPct = d.total > 0 ? (d.prompt / d.total) * 100 : 0;
              return (
                <Box key={d.label} style={{ flex: 1, height: '100%', minWidth: 0 }}>
                  <Tooltip
                    withArrow
                    position="top"
                    multiline
                    maw={300}
                    label={
                      <>
                        <div>{d.fullLabel}</div>
                        <div>输入 {fmtTooltipValue(d.prompt)} tokens</div>
                        <div>输出 {fmtTooltipValue(d.completion)} tokens</div>
                        <div>合计 {fmtTooltipValue(d.total)} tokens</div>
                        <div>成本 {d.costText}</div>
                        {d.extra ? <div>{d.extra}</div> : null}
                      </>
                    }
                  >
                    <Box
                      h="100%"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        cursor: 'default',
                      }}
                    >
                      <Box
                        style={{
                          // 用量极小时也留一丝可见高度，避免整根消失
                          height: `max(${totalPct}%, 3px)`,
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: '3px 3px 0 0',
                          overflow: 'hidden',
                          transition: 'height .3s ease',
                        }}
                      >
                        <Box style={{ height: `${cPct}%`, background: 'linear-gradient(180deg, #34c77b 0%, #1a8752 100%)' }} />
                        <Box style={{ height: `${pPct}%`, background: 'linear-gradient(180deg, #4f8cff 0%, #2f68d8 100%)' }} />
                      </Box>
                    </Box>
                  </Tooltip>
                </Box>
              );
            })}
          </Group>
        </Box>
      </Group>

      {/* X 轴刻度 */}
      <Group gap={4} wrap="nowrap" mt={6} pl={66} pr={6}>
        {data.map((d, i) => (
          <Text
            key={d.label}
            fz={10}
            c="dimmed"
            ta="center"
            style={{ flex: 1, minWidth: 0, opacity: i % labelStep === 0 ? 1 : 0 }}
          >
            {d.label}
          </Text>
        ))}
      </Group>
    </Box>
  );
}

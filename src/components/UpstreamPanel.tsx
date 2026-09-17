import { ActionIcon, Box, Button, Collapse, Group, Text, UnstyledButton } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconChevronRight } from '@tabler/icons-react';
import { useState } from 'react';

import type { ModelConfig, ModelMeta } from '../api/types';
import { HealthBadge, sortUpstreams } from './HealthBadge';

interface Props {
  meta: ModelMeta | null;
  config: ModelConfig;
  disabled?: boolean;
  onToggle: (kind: 'sel' | 'excl', upstream: string, on: boolean) => void;
  onMove: (upstream: string, dir: -1 | 1) => void;
  onBulk: (action: 'all' | 'clear') => void;
}

function SummaryChips({ selected, excluded }: { selected: string[]; excluded: string[] }) {
  if (!selected.length && !excluded.length) {
    return (
      <Text fz={11.5} c="dimmed">
        自动 · 网关智能选择
      </Text>
    );
  }
  return (
    <>
      {selected.slice(0, 3).map((u, i) => (
        <Box
          key={u}
          px={7}
          py={1}
          style={{
            borderRadius: 9,
            background: 'rgba(79,140,255,.16)',
            border: '1px solid rgba(79,140,255,.35)',
          }}
        >
          <Text fz={11} c="control.3" className="mono">
            {i + 1} {u}
          </Text>
        </Box>
      ))}
      {selected.length > 3 ? (
        <Text fz={11} c="dimmed">
          +{selected.length - 3}
        </Text>
      ) : null}
      {excluded.length ? (
        <Box
          px={7}
          py={1}
          style={{ borderRadius: 9, background: 'rgba(229,83,75,.16)', border: '1px solid rgba(229,83,75,.35)' }}
        >
          <Text fz={11} c="red.3">
            ✕ {excluded.length}
          </Text>
        </Box>
      ) : null}
    </>
  );
}

export default function UpstreamPanel({ meta, config, disabled, onToggle, onMove, onBulk }: Props) {
  const [open, setOpen] = useState(false);
  const upstreams = sortUpstreams(meta);
  const statusMap = meta?.upstreamStatus || {};
  const detailMap = meta?.upstreamDetail || {};
  const selected = config.upstreams || [];
  const excluded = config.exclude || [];

  if (!upstreams.length) {
    return (
      <Text fz={11.5} c="dimmed">
        尚未探测到上游，先点「探测」
      </Text>
    );
  }

  return (
    <Box>
      <UnstyledButton
        onClick={() => setOpen((o) => !o)}
        w="100%"
        aria-expanded={open}
        style={{ display: 'block', padding: '3px 0' }}
      >
        <Group gap={6} wrap="wrap" align="center">
          <IconChevronRight
            size={13}
            style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .18s ease' }}
            opacity={0.65}
          />
          <SummaryChips selected={selected} excluded={excluded} />
        </Group>
      </UnstyledButton>

      <Collapse in={open}>
        <Box
          mt={6}
          p={6}
          style={{
            border: '1px solid var(--mantine-color-ink-5)',
            borderRadius: 'var(--mantine-radius-sm)',
            background: 'var(--mantine-color-ink-7)',
            maxHeight: 'min(520px, 65vh)',
            overflow: 'auto',
          }}
        >
          {upstreams.map((u) => {
            const order = selected.indexOf(u);
            const isSel = order >= 0;
            const isEx = excluded.includes(u);
            const d = detailMap[u];
            return (
              <Group
                key={u}
                gap="xs"
                wrap="nowrap"
                py={5}
                style={{ borderBottom: '1px dashed var(--mantine-color-ink-5)' }}
              >
                <Text w={18} fz={11.5} fw={700} c="control.4" ta="center" style={{ flex: 'none' }}>
                  {isSel ? order + 1 : ''}
                </Text>

                <Box style={{ flex: 1, minWidth: 130 }}>
                  <Text className="mono" fz={12} truncate opacity={isEx ? 0.5 : 1}>
                    {u}
                  </Text>
                  <Text fz={11} c="dimmed" truncate>
                    {d ? `${d.name}${d.endpoints > 1 ? ` ×${d.endpoints}` : ''}` : ''}
                  </Text>
                </Box>

                <Box style={{ flex: 'none' }}>
                  <HealthBadge status={statusMap[u]} excluded={isEx} />
                </Box>

                <Button
                  size="compact-xs"
                  radius="xl"
                  variant={isSel ? 'filled' : 'default'}
                  color="control"
                  disabled={disabled}
                  onClick={() => onToggle('sel', u, !isSel)}
                >
                  优先
                </Button>
                <Button
                  size="compact-xs"
                  radius="xl"
                  variant={isEx ? 'filled' : 'default'}
                  color="red"
                  disabled={disabled}
                  onClick={() => onToggle('excl', u, !isEx)}
                >
                  排除
                </Button>

                <ActionIcon
                  size="sm"
                  variant="subtle"
                  disabled={disabled || !isSel}
                  onClick={() => onMove(u, -1)}
                  aria-label="上移提高优先级"
                >
                  <IconArrowUp size={13} />
                </ActionIcon>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  disabled={disabled || !isSel}
                  onClick={() => onMove(u, 1)}
                  aria-label="下移降低优先级"
                >
                  <IconArrowDown size={13} />
                </ActionIcon>
              </Group>
            );
          })}

          <Group gap="xs" mt={8} wrap="wrap">
            <Button size="compact-xs" variant="default" disabled={disabled} onClick={() => onBulk('all')}>
              全选优先
            </Button>
            <Button size="compact-xs" variant="default" disabled={disabled} onClick={() => onBulk('clear')}>
              清空
            </Button>
            <Text fz={10.5} c="dimmed">
              点「优先」按序尝试，异常自动顺切；点「排除」永不使用
            </Text>
          </Group>
        </Box>
      </Collapse>
    </Box>
  );
}

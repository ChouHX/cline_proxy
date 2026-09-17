import { Box, Center, Group, Loader, Text, Title, type BoxProps } from '@mantine/core';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-end" mb="md" wrap="wrap" gap="sm">
      <Box>
        <Title order={2} fz={19}>
          {title}
        </Title>
        {description ? (
          <Text fz={12.5} c="dimmed" mt={3} maw={760}>
            {description}
          </Text>
        ) : null}
      </Box>
      {actions ? <Group gap="xs">{actions}</Group> : null}
    </Group>
  );
}

export function LoadingBlock({ label = '加载中…', height = 160 }: { label?: string; height?: number }) {
  return (
    <Center mih={height}>
      <Group gap="sm">
        <Loader size="xs" />
        <Text fz={12.5} c="dimmed">
          {label}
        </Text>
      </Group>
    </Center>
  );
}

export function ErrorBlock({ message, height = 140 }: { message: string; height?: number }) {
  return (
    <Center mih={height}>
      <Text fz={12.5} c="red.4">
        {message}
      </Text>
    </Center>
  );
}

export function EmptyBlock({ message }: { message: string }) {
  return (
    <Center mih={90}>
      <Text fz={12.5} c="dimmed">
        {message}
      </Text>
    </Center>
  );
}

/** 数据卡片外壳：统一圆角、边框与轻微内阴影 */
export function Panel({ children, ...rest }: BoxProps & { children: ReactNode }) {
  return (
    <Box
      p="md"
      style={{
        border: '1px solid var(--mantine-color-ink-5)',
        borderRadius: 'var(--mantine-radius-md)',
        background: 'var(--mantine-color-ink-6)',
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}

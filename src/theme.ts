import { createTheme, type MantineColorsTuple } from '@mantine/core';

// 主色沿用旧控制台的 #4f8cff，索引 6 即深色模式下的 primaryShade
const control: MantineColorsTuple = [
  '#eaf1ff',
  '#d3e1ff',
  '#a7c3ff',
  '#78a3ff',
  '#578bff',
  '#427cf7',
  '#4f8cff',
  '#2f68d8',
  '#2451ad',
  '#1a3b83',
];

// 偏蓝的暗色阶：0 为主文本、7 为页面底色、6 为卡片底
const ink: MantineColorsTuple = [
  '#e6e9f0',
  '#aab2c4',
  '#8b93a5',
  '#5a6274',
  '#3a4152',
  '#2a2f3c',
  '#1d212b',
  '#141821',
  '#0f1218',
  '#0b0d12',
];

// 上游健康度语义色，与旧 UI 的 ✔可用/⏳限流/✘不可钉 一一对应
const health: MantineColorsTuple = [
  '#e6f7ee',
  '#c9ecd9',
  '#9cd9ba',
  '#6ec69b',
  '#45b681',
  '#34c77b',
  '#22a866',
  '#1a8752',
  '#14663e',
  '#0d452b',
];

const warn: MantineColorsTuple = [
  '#fff4e2',
  '#ffe6c2',
  '#ffcb85',
  '#ffaf47',
  '#ff9a1f',
  '#f0a53c',
  '#d98a1f',
  '#ad6c14',
  '#814f0e',
  '#573407',
];

export const theme = createTheme({
  primaryColor: 'control',
  primaryShade: { light: 6, dark: 6 },
  colors: { control, ink, health, warn },
  fontFamily: '"IBM Plex Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", "Fira Code", ui-monospace, Consolas, monospace',
  headings: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
    fontWeight: '600',
  },
  defaultRadius: 'md',
  cursorType: 'pointer',
  components: {
    Paper: {
      defaultProps: { withBorder: true },
      styles: { root: { backgroundColor: 'var(--mantine-color-ink-6)' } },
    },
    Table: {
      defaultProps: { highlightOnHover: true, verticalSpacing: 'sm', horizontalSpacing: 'md' },
    },
    Code: { defaultProps: { fz: 'xs' } },
  },
});

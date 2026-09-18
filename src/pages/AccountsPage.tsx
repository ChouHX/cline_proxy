import {
  Box,
  Button,
  Checkbox,
  Group,
  Radio,
  ScrollArea,
  Switch,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { getAccounts, getUsage, refreshUsage, saveAccounts, testAccount } from '../api/client';
import type { Account, AccountUsage } from '../api/types';
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader, Panel } from '../components/PageKit';
import { UsageBadges } from '../components/UsageMeter';
import { useRefresh } from '../data/RefreshContext';
import { useAsyncData } from '../hooks/useAsyncData';

const fmt = (ts?: number) => (ts ? new Date(ts).toLocaleTimeString() : '—');

export default function AccountsPage() {
  const { token } = useRefresh();
  const { data, loading, error, reload } = useAsyncData(async () => {
    const [accounts, usage] = await Promise.all([getAccounts(), getUsage()]);
    return { accounts, usage };
  }, [token]);

  const [draft, setDraft] = useState<Account[]>([]);
  const [mode, setMode] = useState<'single' | 'roundrobin'>('single');
  const [active, setActive] = useState(0);
  const [showKeys, setShowKeys] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshingUsage, setRefreshingUsage] = useState(false);
  const [testingIdx, setTestingIdx] = useState<number | null>(null);

  const accData = data?.accounts;
  const usageMap: Record<string, AccountUsage> = data?.usage.usage || {};

  useEffect(() => {
    if (!accData) return;
    setDraft(accData.accounts.map((a) => ({ ...a })));
    setMode(accData.mode);
    setActive(accData.active);
  }, [accData]);

  const stats = accData?.stats || {};

  const pullUsage = async () => {
    setRefreshingUsage(true);
    try {
      await refreshUsage();
      reload();
    } catch (e) {
      notifications.show({ message: `额度刷新失败：${e instanceof Error ? e.message : ''}`, color: 'red' });
    } finally {
      setRefreshingUsage(false);
    }
  };

  const patch = (i: number, next: Partial<Account>) =>
    setDraft((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...next } : a)));

  const addRow = () => {
    setDraft((prev) => [...prev, { name: `账号${prev.length + 1}`, key: '', enabled: true }]);
  };

  const delRow = (i: number) => {
    setDraft((prev) => prev.filter((_, idx) => idx !== i));
    setActive((a) => Math.min(a, Math.max(0, draft.length - 2)));
  };

  const save = async () => {
    if (!draft.some((a) => a.key.trim())) {
      notifications.show({ message: '至少需要一个 key 非空的账号', color: 'red' });
      return;
    }
    setSaving(true);
    try {
      const r = await saveAccounts({ accounts: draft, mode, active });
      notifications.show({
        message: `已保存：${r.accounts} 个账号 · ${r.mode === 'roundrobin' ? '轮询' : '单账号'}模式`,
        color: 'health',
      });
      reload();
    } catch (e) {
      notifications.show({ message: `保存失败：${e instanceof Error ? e.message : '未知错误'}`, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (i: number) => {
    const acc = draft[i];
    if (!acc.key.trim()) {
      notifications.show({ message: '请先填写该账号的 key', color: 'red' });
      return;
    }
    setTestingIdx(i);
    try {
      const r = await testAccount(acc.key.trim());
      notifications.show({
        message: r.ok
          ? `✔ ${acc.name} 可用（${r.ms} ms）${r.note ? ` · ${r.note}` : ''}`
          : `✘ ${acc.name} 不可用：${r.error || '未知错误'}`,
        color: r.ok ? 'health' : 'red',
        autoClose: r.ok ? 5000 : 9000,
      });
    } catch (e) {
      notifications.show({ message: `测试失败：${e instanceof Error ? e.message : ''}`, color: 'red' });
    } finally {
      setTestingIdx(null);
    }
  };

  return (
    <Box>
      <PageHeader
        title="账号池"
        description="所有经代理的请求按当前模式从池中取用上游账号；单账号模式下只用手动指定的那个。"
        actions={
          <>
            <Button
              variant="default"
              size="xs"
              loading={refreshingUsage}
              leftSection={<IconRefresh size={14} />}
              onClick={pullUsage}
            >
              刷新额度
            </Button>
            <Button variant="default" size="xs" leftSection={<IconPlus size={14} />} onClick={addRow}>
              添加账号
            </Button>
            <Button size="xs" loading={saving} onClick={save}>
              保存账号配置
            </Button>
          </>
        }
      />

      <Panel p="sm" mb="md">
        <Group gap="lg" wrap="wrap" align="center">
          <Radio.Group
            value={mode}
            onChange={(v) => setMode(v as 'single' | 'roundrobin')}
            label="取用模式"
          >
            <Group gap="lg" mt={4}>
              <Radio value="single" label="单账号（手动指定）" size="xs" />
              <Radio value="roundrobin" label="账号池轮询" size="xs" />
            </Group>
          </Radio.Group>
          <Switch
            label="显示密钥"
            size="sm"
            checked={showKeys}
            onChange={(e) => setShowKeys(e.currentTarget.checked)}
          />
        </Group>
      </Panel>

      <Panel p={0}>
        {error ? (
          <ErrorBlock message={error} />
        ) : loading && !draft.length ? (
          <LoadingBlock />
        ) : draft.length === 0 ? (
          <EmptyBlock message="暂无账号，点右上「添加账号」" />
        ) : (
          <ScrollArea>
            <Table miw={1140} fz={12.5}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={64}>使用</Table.Th>
                  <Table.Th w={150}>名称</Table.Th>
                  <Table.Th>API Key</Table.Th>
                  <Table.Th w={64}>启用</Table.Th>
                  <Table.Th w={96}>请求数</Table.Th>
                  <Table.Th w={110}>最近使用</Table.Th>
                  <Table.Th w={186}>额度（已用）</Table.Th>
                  <Table.Th w={150}>操作</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {draft.map((a, i) => {
                  const st = stats[a.name] || { requests: 0, lastUsed: 0, lastError: null };
                  return (
                    <Table.Tr key={`${a.name}-${i}`}>
                      <Table.Td>
                        <Radio
                          checked={mode === 'single' && i === active}
                          disabled={mode !== 'single'}
                          onChange={() => setActive(i)}
                          aria-label={`使用 ${a.name}`}
                        />
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          size="xs"
                          value={a.name}
                          onChange={(e) => patch(i, { name: e.currentTarget.value })}
                        />
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          size="xs"
                          type={showKeys ? 'text' : 'password'}
                          value={a.key}
                          placeholder="sk_…"
                          onChange={(e) => patch(i, { key: e.currentTarget.value })}
                          styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', minWidth: 260 } }}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Checkbox
                          checked={a.enabled !== false}
                          onChange={(e) => patch(i, { enabled: e.currentTarget.checked })}
                          aria-label="启用"
                        />
                      </Table.Td>
                      <Table.Td>
                        <Text fz={12.5}>{st.requests ?? 0}</Text>
                        {st.lastError ? (
                          <Text fz={10.5} c="warn.4">
                            最近有错误
                          </Text>
                        ) : null}
                      </Table.Td>
                      <Table.Td>
                        <Text fz={11.5} c="dimmed">
                          {fmt(st.lastUsed)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <UsageBadges usage={usageMap[a.name]} />
                      </Table.Td>
                      <Table.Td>
                        <Group gap={5} wrap="nowrap">
                          <Button
                            size="compact-xs"
                            variant="default"
                            loading={testingIdx === i}
                            onClick={() => runTest(i)}
                          >
                            测试
                          </Button>
                          <Button
                            size="compact-xs"
                            variant="subtle"
                            color="red"
                            leftSection={<IconTrash size={12} />}
                            onClick={() => delRow(i)}
                          >
                            删除
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Panel>
    </Box>
  );
}

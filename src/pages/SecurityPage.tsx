import { Alert, Badge, Box, Button, Checkbox, Group, Stack, Switch, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle, IconShieldCheck, IconShieldOff } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { getSecurity, saveSecurity, setKey as persistKey } from '../api/client';
import type { SecurityResponse } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { LoadingBlock, PageHeader, Panel } from '../components/PageKit';
import { useRefresh } from '../data/RefreshContext';
import { useAsyncData } from '../hooks/useAsyncData';

export default function SecurityPage() {
  const { token } = useRefresh();
  const { revalidate, meta } = useAuth();
  const { data, loading, reload } = useAsyncData<SecurityResponse>(() => getSecurity(), [token]);

  const [proxyKey, setProxyKey] = useState('');
  const [publicBase, setPublicBase] = useState('');
  const [exposeCatalog, setExposeCatalog] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setProxyKey(data.proxyKey || '');
    setPublicBase(data.publicBaseUrl || '');
    setExposeCatalog(!!data.exposeCatalog);
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await saveSecurity({
        proxyKey: proxyKey.trim(),
        publicBaseUrl: publicBase.trim(),
        exposeCatalog,
      });
      // 关键：密钥轮换后立即同步本机凭据，否则下一次请求就会 401 把自己锁在外面
      persistKey(r.proxyKey || '');
      await revalidate();
      notifications.show({
        message: r.authRequired ? '已保存，鉴权开启' : '已保存，鉴权已关闭（任何客户端都可访问代理）',
        color: r.authRequired ? 'health' : 'warn',
      });
      reload();
    } catch (e) {
      notifications.show({ message: `保存失败：${e instanceof Error ? e.message : '未知错误'}`, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const toggleExpose = async (v: boolean) => {
    setExposeCatalog(v);
    try {
      const r = await saveSecurity({ exposeCatalog: v });
      setExposeCatalog(!!r.exposeCatalog);
      notifications.show({
        message: v ? '已开启：/v1/models 将包含全部目录模型' : '已关闭：/v1/models 仅返回订阅模型',
        color: 'health',
      });
    } catch (e) {
      setExposeCatalog(!v);
      notifications.show({ message: `保存失败：${e instanceof Error ? e.message : ''}`, color: 'red' });
    }
  };

  if (loading && !data) return <LoadingBlock />;

  const authOn = !!data?.authRequired;

  return (
    <Box>
      <PageHeader
        title="访问与安全"
        description="代理密钥既是下游客户端的访问凭据，也是进入本控制台的登录凭据。留空即关闭鉴权。"
        actions={
          <Badge
            variant="light"
            color={authOn ? 'health' : 'warn'}
            leftSection={authOn ? <IconShieldCheck size={12} /> : <IconShieldOff size={12} />}
          >
            {authOn ? '鉴权已开启' : '鉴权已关闭'}
          </Badge>
        }
      />

      <Stack gap="md">
        <Panel>
          <Text fw={600} fz={13.5} mb="sm">
            下游代理密钥
          </Text>
          <Group align="flex-end" gap="sm" wrap="wrap">
            <TextInput
              label="代理密钥"
              placeholder="留空 = 关闭鉴权"
              w={360}
              value={proxyKey}
              type={showKey ? 'text' : 'password'}
              onChange={(e) => setProxyKey(e.currentTarget.value)}
              styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
            />
            <Switch
              label="显示"
              size="sm"
              checked={showKey}
              onChange={(e) => setShowKey(e.currentTarget.checked)}
              mb={6}
            />
          </Group>

          <TextInput
            label="公网代理地址"
            placeholder="如 https://cline.xxx.sslip.io（本地留空）"
            mt="md"
            w={520}
            maw="100%"
            value={publicBase}
            onChange={(e) => setPublicBase(e.currentTarget.value)}
            styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
          />

          <Group mt="lg" gap="sm">
            <Button loading={saving} onClick={save}>
              保存访问设置
            </Button>
            <Text fz={11.5} c="dimmed" maw={520}>
              修改密钥后客户端需改用新密钥；控制台会自动更新本机保存的凭据，不会被锁在外面。
            </Text>
          </Group>
        </Panel>

        <Panel>
          <Text fw={600} fz={13.5} mb="xs">
            代理暴露面
          </Text>
          <Checkbox
            checked={exposeCatalog}
            onChange={(e) => void toggleExpose(e.currentTarget.checked)}
            label="把目录模型加入代理的 /v1/models"
            description="默认关闭：客户端只看到订阅模型，避免模型选择器被上百个目录模型淹没。"
          />

          <Alert
            mt="md"
            variant="light"
            color="ink"
            icon={<IconInfoCircle size={15} />}
            styles={{ message: { fontSize: 12, lineHeight: 1.8 } }}
          >
            当前代理地址：
            <Text component="span" className="mono" c="control.3">
              {data?.proxyBase || meta?.proxyBase || '—'}
            </Text>
          </Alert>
        </Panel>
      </Stack>
    </Box>
  );
}

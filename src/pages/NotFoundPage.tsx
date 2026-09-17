import { Button, Center, Code, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <Center mih="100vh">
      <Stack align="center" gap="xs">
        <Title order={2}>404</Title>
        <Text c="dimmed" fz={13}>
          没有这个路由：<Code>{window.location.pathname}</Code>
        </Text>
        <Button component={Link} to="/dashboard" variant="light" mt="sm">
          回到控制台
        </Button>
      </Stack>
    </Center>
  );
}

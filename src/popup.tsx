import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, Container, Stack, Title, Text, Button, Card, Badge, Group, Box } from '@mantine/core';
import '@mantine/core/styles.css';

const App: React.FC = () => {
  const [status, setStatus] = React.useState<'idle' | 'active'>('idle');

  const handleOpenExcelPopup = () => {
    chrome.windows.create({
      url: chrome.runtime.getURL('excelPopup.html'),
      type: 'popup',
      width: 650,
      height: 700
    });
  };

  const handleOpenPerplexity = async () => {
    setStatus('active');
    try {
      await chrome.runtime.sendMessage({ type: 'OPEN_OR_SWITCH_TAB' });
    } catch (error) {
      console.error('Error:', error);
    }
    setStatus('idle');
  };

  return (
    <MantineProvider theme={{ primaryColor: 'blue' }}>
      <Container size="xs" p="md" style={{ width: 350 }}>
        <Stack gap="md">
          <Box>
            <Title order={2} size="h3">Perplexity Automation</Title>
            <Text size="sm" c="dimmed">AI-powered automation tools</Text>
          </Box>

          <Card withBorder radius="md" p="sm">
            <Group gap="xs">
              <Badge color={status === 'active' ? 'blue' : 'gray'} variant="dot">
                {status === 'active' ? 'Active' : 'Ready'}
              </Badge>
            </Group>
          </Card>

          <Stack gap="sm">
            <Button
              onClick={handleOpenExcelPopup}
              radius="md"
              size="md"
              fullWidth
            >
              Excel Tag Automation
            </Button>

            <Button
              onClick={handleOpenPerplexity}
              variant="light"
              radius="md"
              size="md"
              fullWidth
            >
              Open Perplexity
            </Button>
          </Stack>

          <Text size="xs" c="dimmed" ta="center">
            v2.0.0
          </Text>
        </Stack>
      </Container>
    </MantineProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);


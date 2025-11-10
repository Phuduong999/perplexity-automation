/**
 * Layout Component
 * Main layout with navigation
 */

import { Outlet, Link, useNavigate } from 'react-router-dom';
import { AppShell, Burger, Group, NavLink, Text, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDashboard,
  IconFiles,
  IconClipboardList,
  IconLogout,
} from '@tabler/icons-react';
import { useAuthStore } from '@/store/authStore';

export function Layout() {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text size="xl" fw={700}>
              Perplexity Automation
            </Text>
          </Group>

          <Group>
            <Text size="sm">{user?.email}</Text>
            <Button
              variant="subtle"
              leftSection={<IconLogout size={16} />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          component={Link}
          to="/"
          label="Dashboard"
          leftSection={<IconDashboard size={20} />}
        />
        <NavLink
          component={Link}
          to="/files"
          label="Files"
          leftSection={<IconFiles size={20} />}
        />
        <NavLink
          component={Link}
          to="/jobs"
          label="Jobs"
          leftSection={<IconClipboardList size={20} />}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}


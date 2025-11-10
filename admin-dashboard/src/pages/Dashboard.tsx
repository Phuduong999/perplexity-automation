/**
 * Dashboard Page
 * Main analytics and overview page
 */

import { useQuery } from '@tanstack/react-query';
import { Grid, Card, Text, Title, Group, Stack, RingProgress } from '@mantine/core';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { jobsApi, filesApi } from '@/lib/api';

export function Dashboard() {
  const { data: jobStats } = useQuery({
    queryKey: ['job-stats'],
    queryFn: async () => {
      const response = await jobsApi.getStats();
      return response.data.data;
    },
  });

  const { data: recentJobs } = useQuery({
    queryKey: ['recent-jobs'],
    queryFn: async () => {
      const response = await jobsApi.getAll({ limit: 5 });
      return response.data.data.jobs;
    },
  });

  const { data: recentFiles } = useQuery({
    queryKey: ['recent-files'],
    queryFn: async () => {
      const response = await filesApi.getAll({ limit: 5 });
      return response.data.data.files;
    },
  });

  const chartData = [
    { name: 'Pending', value: jobStats?.pending || 0 },
    { name: 'Running', value: jobStats?.running || 0 },
    { name: 'Completed', value: jobStats?.completed || 0 },
    { name: 'Failed', value: jobStats?.failed || 0 },
  ];

  const completionRate = jobStats?.total
    ? ((jobStats.completed / jobStats.total) * 100).toFixed(1)
    : 0;

  return (
    <Stack gap="lg">
      <Title order={1}>Dashboard</Title>

      {/* Stats Cards */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                Total Jobs
              </Text>
              <Title order={2}>{jobStats?.total || 0}</Title>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                Running
              </Text>
              <Title order={2} c="blue">
                {jobStats?.running || 0}
              </Title>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                Completed
              </Text>
              <Title order={2} c="green">
                {jobStats?.completed || 0}
              </Title>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                Failed
              </Text>
              <Title order={2} c="red">
                {jobStats?.failed || 0}
              </Title>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Charts */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">
              Job Status Distribution
            </Title>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#228be6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">
              Completion Rate
            </Title>
            <Group justify="center">
              <RingProgress
                size={200}
                thickness={20}
                sections={[{ value: Number(completionRate), color: 'green' }]}
                label={
                  <Text ta="center" size="xl" fw={700}>
                    {completionRate}%
                  </Text>
                }
              />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Recent Activity */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={3} mb="md">
          Recent Jobs
        </Title>
        <Stack gap="xs">
          {recentJobs?.map((job: any) => (
            <Group key={job.id} justify="space-between">
              <Text>{job.file.originalName}</Text>
              <Text c="dimmed" size="sm">
                {job.status}
              </Text>
            </Group>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}


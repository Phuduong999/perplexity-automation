/**
 * Jobs Page
 * Processing job monitoring and management
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack,
  Title,
  Table,
  Badge,
  Progress,
  Group,
  ActionIcon,
  Modal,
  Text,
  Button,
} from '@mantine/core';
import { IconX, IconEye } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { jobsApi } from '@/lib/api';
import { format } from 'date-fns';

export function Jobs() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', page],
    queryFn: async () => {
      const response = await jobsApi.getAll({ page, limit: 10 });
      return response.data.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => jobsApi.cancel(id),
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Job cancelled successfully',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const handleViewDetails = async (jobId: string) => {
    const response = await jobsApi.getById(jobId);
    setSelectedJob(response.data.data.job);
    setDetailsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'gray',
      RUNNING: 'blue',
      COMPLETED: 'green',
      FAILED: 'red',
      CANCELLED: 'orange',
    };
    return colors[status] || 'gray';
  };

  return (
    <Stack gap="lg">
      <Title order={1}>Processing Jobs</Title>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>File</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Progress</Table.Th>
            <Table.Th>Rows</Table.Th>
            <Table.Th>Started</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data?.jobs.map((job: any) => (
            <Table.Tr key={job.id}>
              <Table.Td>{job.file.originalName}</Table.Td>
              <Table.Td>
                <Badge color={getStatusColor(job.status)}>{job.status}</Badge>
              </Table.Td>
              <Table.Td>
                <Progress value={job.progress} size="lg" />
              </Table.Td>
              <Table.Td>
                {job.processedRows} / {job.totalRows}
              </Table.Td>
              <Table.Td>
                {job.startedAt
                  ? format(new Date(job.startedAt), 'MMM dd, HH:mm')
                  : '-'}
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() => handleViewDetails(job.id)}
                  >
                    <IconEye size={16} />
                  </ActionIcon>
                  {(job.status === 'PENDING' || job.status === 'RUNNING') && (
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => cancelMutation.mutate(job.id)}
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal
        opened={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Job Details"
        size="lg"
      >
        {selectedJob && (
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={500}>Status:</Text>
              <Badge color={getStatusColor(selectedJob.status)}>
                {selectedJob.status}
              </Badge>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Progress:</Text>
              <Text>{selectedJob.progress.toFixed(1)}%</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Total Rows:</Text>
              <Text>{selectedJob.totalRows}</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Processed:</Text>
              <Text>{selectedJob.processedRows}</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Failed:</Text>
              <Text>{selectedJob.failedRows}</Text>
            </Group>
            {selectedJob.errorMessage && (
              <Stack gap="xs">
                <Text fw={500}>Error:</Text>
                <Text c="red" size="sm">
                  {selectedJob.errorMessage}
                </Text>
              </Stack>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}


/**
 * Files Page
 * File management and upload
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack,
  Title,
  Button,
  Table,
  Badge,
  Group,
  FileButton,
  Text,
  ActionIcon,
  Modal,
} from '@mantine/core';
import { IconUpload, IconDownload, IconTrash, IconPlayerPlay } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { filesApi } from '@/lib/api';
import { format } from 'date-fns';

export function Files() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['files', page],
    queryFn: async () => {
      const response = await filesApi.getAll({ page, limit: 10 });
      return response.data.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => filesApi.upload(file),
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'File uploaded successfully',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setSelectedFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => filesApi.delete(id),
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'File deleted successfully',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setDeleteModalOpen(false);
    },
  });

  const processMutation = useMutation({
    mutationFn: (id: string) => filesApi.process(id),
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Processing started',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleDelete = (id: string) => {
    setFileToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (fileToDelete) {
      deleteMutation.mutate(fileToDelete);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      UPLOADED: 'blue',
      PROCESSING: 'yellow',
      COMPLETED: 'green',
      FAILED: 'red',
      ARCHIVED: 'gray',
    };
    return colors[status] || 'gray';
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={1}>Files</Title>
        <Group>
          <FileButton onChange={setSelectedFile} accept=".xlsx,.xls">
            {(props) => (
              <Button {...props} leftSection={<IconUpload size={16} />}>
                Select File
              </Button>
            )}
          </FileButton>
          {selectedFile && (
            <Button onClick={handleUpload} loading={uploadMutation.isPending}>
              Upload {selectedFile.name}
            </Button>
          )}
        </Group>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>File Name</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Size</Table.Th>
            <Table.Th>Uploaded</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data?.files.map((file: any) => (
            <Table.Tr key={file.id}>
              <Table.Td>{file.originalName}</Table.Td>
              <Table.Td>
                <Badge color={getStatusColor(file.status)}>{file.status}</Badge>
              </Table.Td>
              <Table.Td>{(file.fileSize / 1024).toFixed(2)} KB</Table.Td>
              <Table.Td>{format(new Date(file.createdAt), 'MMM dd, yyyy')}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() => processMutation.mutate(file.id)}
                    disabled={file.status !== 'UPLOADED'}
                  >
                    <IconPlayerPlay size={16} />
                  </ActionIcon>
                  <ActionIcon variant="light" color="green">
                    <IconDownload size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => handleDelete(file.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Delete"
      >
        <Text>Are you sure you want to delete this file?</Text>
        <Group mt="md" justify="flex-end">
          <Button variant="default" onClick={() => setDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmDelete} loading={deleteMutation.isPending}>
            Delete
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}


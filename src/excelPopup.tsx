import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, Container, Stack, Title, Text, Select, Button, Group, Progress, Card, Badge, Checkbox, Accordion, ScrollArea, Box, Modal } from '@mantine/core';
import '@mantine/core/styles.css';
import './excelPopup.css';
import { ExcelWorkflowManager } from './excelWorkflow';
import { EXCEL_CONFIG, COMPUTED, STORAGE_KEYS, UI_STYLES } from './constants';
import {
  autoSaveToStorage,
  loadAutoSaveData,
  hasAutoSaveData,
  clearAutoSaveData,
  exportAutoSaveToFile,
  setupAutoSaveOnUnload,
  ProcessedRowData
} from './autoSave';

interface AppState {
  status: 'idle' | 'loading' | 'processing' | 'complete' | 'error';
  statusText: string;
  selectedPart: string;
  singlePartMode: boolean;
  testMode: boolean;
  processedCount: number;
  totalRows: number;
  currentRow: string;
  logs: Array<{ text: string; type: 'info' | 'success' | 'error' | 'warning' }>;
  isProcessing: boolean;
  hasAutoSave: boolean;
  showAutoSaveModal: boolean;
  processedRows: ProcessedRowData[];
}

const App: React.FC = () => {
  const [state, setState] = React.useState<AppState>({
    status: 'idle',
    statusText: 'Select a part to load',
    selectedPart: '',
    singlePartMode: false,
    testMode: false,
    processedCount: 0,
    totalRows: 0,
    currentRow: '',
    logs: [{ text: 'Excel Tag Automation - Production Mode', type: 'info' }],
    isProcessing: false,
    hasAutoSave: false,
    showAutoSaveModal: false,
    processedRows: []
  });

  const workflowRef = React.useRef<ExcelWorkflowManager | null>(null);

  // Restore state from background processor on mount
  React.useEffect(() => {
    const restoreState = async () => {
      try {
        // Get state from background processor
        const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });

        if (response.success && response.state) {
          const bgState = response.state;

          // Restore logs
          setState(prev => ({
            ...prev,
            logs: bgState.logs.map((log: any) => ({
              text: log.text,
              type: log.type
            })),
            isProcessing: bgState.isProcessing
          }));

          // Restore threads info
          if (bgState.threads.length > 0) {
            const currentThread = bgState.threads.find((t: any) => t.id === bgState.currentThread);
            if (currentThread) {
              setState(prev => ({
                ...prev,
                totalRows: currentThread.totalRows,
                processedCount: currentThread.processedRows,
                status: currentThread.status === 'running' ? 'processing' : 'idle',
                statusText: currentThread.status === 'running'
                  ? `Processing ${currentThread.processedRows}/${currentThread.totalRows}`
                  : 'Ready'
              }));
            }
          }

          addLog('Restored state from background processor', 'success');
        }

        // Check for auto-save data
        const hasData = await hasAutoSaveData();
        if (hasData) {
          setState(prev => ({ ...prev, hasAutoSave: true, showAutoSaveModal: true }));
          addLog('Found auto-saved data from previous session', 'warning');
        }
      } catch (error) {
        console.error('Failed to restore state:', error);
        addLog('Failed to restore previous state', 'error');
      }
    };

    restoreState();

    // Setup auto-save on window close
    setupAutoSaveOnUnload(() => ({
      processedRows: state.processedRows,
      currentRowIndex: state.processedCount,
      totalRows: state.totalRows,
      selectedFiles: state.selectedPart ? [state.selectedPart] : []
    }));

    // Listen for updates from background
    const messageListener = (message: any) => {
      if (message.type === 'LOG_ADDED') {
        addLog(message.log.text.split(' - ')[1] || message.log.text, message.log.type);
      } else if (message.type === 'STATE_UPDATE') {
        // Update UI with new state
        const bgState = message.state;
        if (bgState.threads.length > 0) {
          const currentThread = bgState.threads.find((t: any) => t.id === bgState.currentThread);
          if (currentThread) {
            setState(prev => ({
              ...prev,
              processedCount: currentThread.processedRows,
              totalRows: currentThread.totalRows,
              isProcessing: bgState.isProcessing
            }));
          }
        }
      } else if (message.type === 'DOWNLOAD_EXCEL') {
        // ✅ Handle download request from background with folder support
        const { buffer, fileName, partNumber } = message.payload;
        const uint8Array = new Uint8Array(buffer);
        const blob = new Blob([uint8Array], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);

        // Determine folder based on processing status
        const folder = 'processed_files'; // Default folder for all processed files

        const a = document.createElement('a');
        a.href = url;
        // Chrome will auto-create folder if it doesn't exist
        a.download = `${folder}/${fileName}`;
        a.click();

        URL.revokeObjectURL(url);
        addLog(`📥 Downloaded: ${folder}/${fileName}`, 'success');
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // Auto-save every 30 seconds during processing
  React.useEffect(() => {
    if (!state.isProcessing) return;

    const interval = setInterval(async () => {
      if (state.processedRows.length > 0) {
        await autoSaveToStorage({
          processedRows: state.processedRows,
          currentRowIndex: state.processedCount,
          totalRows: state.totalRows,
          selectedFiles: state.selectedPart ? [state.selectedPart] : []
        });
        addLog('Auto-saved progress', 'info');
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [state.isProcessing, state.processedRows, state.processedCount, state.totalRows]);

  const addLog = (text: string, type: AppState['logs'][0]['type'] = 'info') => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, { text: `${new Date().toLocaleTimeString()} - ${text}`, type }]
    }));
  };

  // Restore auto-saved data
  const handleRestoreAutoSave = async () => {
    try {
      const savedData = await loadAutoSaveData();

      setState(prev => ({
        ...prev,
        processedRows: savedData.processedRows,
        processedCount: savedData.currentRowIndex,
        totalRows: savedData.totalRows,
        showAutoSaveModal: false,
        hasAutoSave: false
      }));

      addLog(`Restored ${savedData.processedRows.length} processed rows from auto-save`, 'success');

      // Export to file
      await exportAutoSaveToFile();
      addLog('Auto-save data exported to Downloads', 'success');
    } catch (error) {
      addLog('Failed to restore auto-save data', 'error');
      console.error(error);
    }
  };

  // Discard auto-saved data
  const handleDiscardAutoSave = async () => {
    await clearAutoSaveData();
    setState(prev => ({
      ...prev,
      showAutoSaveModal: false,
      hasAutoSave: false
    }));
    addLog('Auto-save data discarded', 'info');
  };

  const handlePartSelect = (value: string | null) => {
    setState(prev => ({ ...prev, selectedPart: value || '' }));
  };

  const handleLoadPart = async () => {
    if (!state.selectedPart) return;

    setState(prev => ({ ...prev, status: 'loading', statusText: 'Loading Excel file...' }));
    addLog(`Loading Part ${state.selectedPart}...`, 'info');

    try {
      const partNumber = parseInt(state.selectedPart);
      const fileName = COMPUTED.getFileName(partNumber);
      const filePath = `${EXCEL_CONFIG.PARTS_FOLDER}${fileName}`;

      const response = await fetch(chrome.runtime.getURL(filePath));
      const arrayBuffer = await response.arrayBuffer();

      workflowRef.current = new ExcelWorkflowManager(filePath);
      await workflowRef.current.loadPrompt();
      workflowRef.current.parseExcelFromBuffer(arrayBuffer);

      const reviewRows = workflowRef.current.getReviewRows();
      
      setState(prev => ({
        ...prev,
        status: 'idle',
        statusText: `Loaded ${reviewRows.length} rows to process`,
        totalRows: reviewRows.length,
        processedCount: 0
      }));

      addLog(`Loaded ${reviewRows.length} rows with REVIEW status`, 'success');

      await chrome.storage.local.set({
        [STORAGE_KEYS.SELECTED_FILES]: [{ partNumber, fileName, filePath }],
        [STORAGE_KEYS.REVIEW_ROWS]: reviewRows,
        [STORAGE_KEYS.TOTAL_ROWS]: reviewRows.length,
        [STORAGE_KEYS.CURRENT_ROW_INDEX]: 0
      });

    } catch (error) {
      setState(prev => ({ ...prev, status: 'error', statusText: 'Failed to load file' }));
      addLog(`Error: ${error}`, 'error');
    }
  };

  const handleOpenPerplexity = async () => {
    addLog('Opening Perplexity tab...', 'info');
    try {
      const response = await chrome.runtime.sendMessage({ type: 'OPEN_OR_SWITCH_TAB' });
      if (response.success) {
        addLog('Perplexity tab opened', 'success');
      }
    } catch (error) {
      addLog(`Error opening tab: ${error}`, 'error');
    }
  };

  const handleStart = async () => {
    if (!state.selectedPart) {
      addLog('Please select a part first', 'error');
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, status: 'processing', statusText: 'Processing...' }));
    addLog('Starting processing...', 'info');

    await chrome.storage.local.set({
      [STORAGE_KEYS.IS_PROCESSING]: true,
      [STORAGE_KEYS.PROMPT_SENT]: false
    });

    try {
      // Create thread in background
      const partNumber = parseInt(state.selectedPart);
      if (isNaN(partNumber)) {
        throw new Error(`Invalid part number: ${state.selectedPart}`);
      }

      const fileName = COMPUTED.getFileName(partNumber);
      const filePath = `${EXCEL_CONFIG.PARTS_FOLDER}${fileName}`;

      addLog(`Part: ${partNumber}, File: ${fileName}, Path: ${filePath}`, 'info');
      addLog(`Creating thread for Part ${partNumber}`, 'info');

      const createResponse = await chrome.runtime.sendMessage({
        type: 'CREATE_THREAD',
        payload: {
          partNumber: partNumber,
          fileName: fileName,
          filePath: filePath
        }
      });

      if (!createResponse.success) {
        throw new Error(createResponse.error || 'Failed to create thread');
      }

      addLog(`Thread created: ${createResponse.threadId}`, 'success');

      // Open Perplexity tab
      addLog('Opening Perplexity tab...', 'info');
      const tabResponse = await chrome.runtime.sendMessage({ type: 'OPEN_OR_SWITCH_TAB' });
      if (!tabResponse.success) {
        throw new Error(tabResponse.error || 'Failed to open Perplexity tab');
      }

      addLog(`Perplexity tab ready (ID: ${tabResponse.tabId})`, 'success');

      // Start processing
      addLog('Starting background processor...', 'info');
      const startResponse = await chrome.runtime.sendMessage({
        type: 'START_PROCESSING',
        payload: {
          threadId: createResponse.threadId,
          testMode: state.testMode
        }
      });

      if (!startResponse.success) {
        throw new Error(startResponse.error || 'Failed to start processing');
      }

      addLog('Processing started', 'success');
    } catch (error) {
      addLog(`Error: ${error}`, 'error');
      setState(prev => ({ ...prev, isProcessing: false, status: 'error' }));
    }
  };

  const handleStop = async () => {
    setState(prev => ({ ...prev, isProcessing: false, status: 'idle', statusText: 'Stopped' }));
    addLog('Processing stopped', 'warning');
    await chrome.storage.local.set({ [STORAGE_KEYS.IS_PROCESSING]: false });
    await chrome.runtime.sendMessage({ type: 'STOP_PROCESSING' });
  };

  const handleDownloadCurrent = async () => {
    addLog('📥 Downloading current processed file...', 'info');

    try {
      // Request download from background processor
      const response = await chrome.runtime.sendMessage({ type: 'DOWNLOAD_CURRENT' });

      if (!response.success) {
        throw new Error(response.error || 'Failed to download');
      }

      // Download will be triggered by background via DOWNLOAD_EXCEL message
    } catch (error) {
      addLog(`❌ Download error: ${error}`, 'error');
    }
  };

  const handleDownload = async () => {
    addLog('📦 Downloading all processed files...', 'info');

    try {
      // Get processing state to find all threads
      const result = await chrome.storage.local.get(['processingState']);
      const processingState = result.processingState;

      if (!processingState || !processingState.threads || processingState.threads.length === 0) {
        addLog('⚠️ No processed files found', 'warning');
        return;
      }

      const folder = 'processed_files';
      let downloadedCount = 0;

      // Download each thread's processed file
      for (const thread of processingState.threads) {
        try {
          // Get Excel buffer from storage
          const storageKey = `excel_buffer_${thread.id}`;
          const bufferResult = await chrome.storage.local.get([storageKey]);

          if (!bufferResult[storageKey]) {
            addLog(`⚠️ Skipping ${thread.fileName} - no processed data found`, 'warning');
            continue;
          }

          // Convert buffer array to Uint8Array
          const bufferArray = bufferResult[storageKey];
          const uint8Array = new Uint8Array(bufferArray);
          const blob = new Blob([uint8Array], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });
          const url = URL.createObjectURL(blob);

          const fileName = thread.fileName.replace('.xlsx', '_PROCESSED.xlsx');
          const a = document.createElement('a');
          a.href = url;
          a.download = `${folder}/${fileName}`;
          a.click();

          URL.revokeObjectURL(url);
          downloadedCount++;

          addLog(`✅ Downloaded: ${folder}/${fileName} (${thread.processedRows}/${thread.totalRows} rows)`, 'success');

          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          addLog(`❌ Failed to download ${thread.fileName}: ${error}`, 'error');
        }
      }

      addLog(`🎉 Downloaded ${downloadedCount} processed file(s) to ${folder}/`, 'success');

    } catch (error) {
      addLog(`❌ Download error: ${error}`, 'error');
    }
  };

  const progress = state.totalRows > 0 ? (state.processedCount / state.totalRows) * 100 : 0;

  return (
    <MantineProvider theme={{ primaryColor: 'blue' }}>
      <Box
        style={{
          width: '480px',
          height: '600px',
          padding: '12px',
          borderRadius: '16px',
          overflow: 'auto',
          backgroundColor: '#f8f9fa'
        }}
      >
        <Stack gap="xs">
          <Box>
            <Title order={3} size="h4" mb={2}>Excel Tag Automation</Title>
            <Text size="xs" c="dimmed">AI-powered ingredient tagging</Text>
          </Box>

          <Card
            withBorder
            radius="lg"
            p="xs"
            style={{ borderColor: UI_STYLES.COLORS.PRIMARY }}
          >
            <Badge
              color={state.status === 'processing' ? UI_STYLES.COLORS.PRIMARY : state.status === 'error' ? 'red' : state.status === 'complete' ? 'green' : 'gray'}
              variant="dot"
              size="sm"
            >
              {state.statusText}
            </Badge>
          </Card>

          <Card withBorder radius="lg" p="sm">
            <Stack gap="xs">
              <Select
                label="Select Part"
                placeholder="Choose a part"
                value={state.selectedPart}
                onChange={handlePartSelect}
                data={Array.from({ length: EXCEL_CONFIG.TOTAL_PARTS }, (_, i) => ({
                  value: String(i + 1),
                  label: `Part ${i + 1}`
                }))}
                radius="lg"
                size="xs"
              />

              <Checkbox
                label="Single part mode"
                checked={state.singlePartMode}
                onChange={(e) => setState(prev => ({ ...prev, singlePartMode: e.currentTarget.checked }))}
                size="xs"
              />

              <Checkbox
                label="Test mode (5 rows/thread)"
                checked={state.testMode}
                onChange={(e) => setState(prev => ({ ...prev, testMode: e.currentTarget.checked }))}
                size="xs"
              />

              <Button
                onClick={handleLoadPart}
                disabled={!state.selectedPart || state.isProcessing}
                radius="lg"
                fullWidth
                size="xs"
                color={UI_STYLES.COLORS.PRIMARY}
                style={{ borderColor: UI_STYLES.COLORS.PRIMARY }}
              >
                Load Part
              </Button>
            </Stack>
          </Card>

          {state.totalRows > 0 && (
            <Card withBorder radius="lg" p="xs">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="xs" fw={600}>Progress</Text>
                  <Badge variant="light" size="xs">{Math.round(progress)}%</Badge>
                </Group>

                <Progress
                  value={progress}
                  radius="lg"
                  size="sm"
                  color={UI_STYLES.COLORS.PRIMARY}
                />

                <Group grow>
                  <Box>
                    <Text size="xs" c="dimmed">Done</Text>
                    <Text size="lg" fw={700}>{state.processedCount}</Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">Total</Text>
                    <Text size="lg" fw={700}>{state.totalRows}</Text>
                  </Box>
                </Group>

                {state.currentRow && (
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    <strong>Current:</strong> {state.currentRow}
                  </Text>
                )}
              </Stack>
            </Card>
          )}

          <Group grow>
            <Button
              onClick={handleOpenPerplexity}
              variant="light"
              radius="lg"
              disabled={state.isProcessing}
              color={UI_STYLES.COLORS.PRIMARY}
              style={{ borderColor: UI_STYLES.COLORS.PRIMARY }}
              size="xs"
            >
              Open Perplexity
            </Button>

            {!state.isProcessing ? (
              <Button
                onClick={handleStart}
                disabled={state.totalRows === 0}
                radius="lg"
                color={UI_STYLES.COLORS.PRIMARY}
                style={{ borderColor: UI_STYLES.COLORS.PRIMARY }}
                size="xs"
              >
                Start
              </Button>
            ) : (
              <Button
                onClick={handleStop}
                color="red"
                radius="lg"
                size="xs"
              >
                Stop
              </Button>
            )}
          </Group>

          <Group grow>
            <Button
              onClick={handleDownloadCurrent}
              variant="light"
              color="green"
              radius="lg"
              size="sm"
              disabled={state.processedCount === 0}
            >
              📥 Download Current
            </Button>

            <Button
              onClick={handleDownload}
              variant="filled"
              color="green"
              radius="lg"
              size="sm"
            >
              📦 Save All to Folder
            </Button>
          </Group>

          <Accordion variant="contained" radius="lg">
            <Accordion.Item value="logs">
              <Accordion.Control>
                <Text size="xs" fw={600}>Logs ({state.logs.length})</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <ScrollArea h={100} type="auto">
                  <Stack gap={2}>
                    {state.logs.slice(-15).map((log, i) => (
                      <Text
                        key={i}
                        size="xs"
                        c={log.type === 'error' ? 'red' : log.type === 'success' ? 'green' : log.type === 'warning' ? 'orange' : 'dimmed'}
                        ff="monospace"
                      >
                        {log.text}
                      </Text>
                    ))}
                  </Stack>
                </ScrollArea>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </Box>

      {/* Auto-Save Restore Modal */}
      <Modal
        opened={state.showAutoSaveModal}
        onClose={() => setState(prev => ({ ...prev, showAutoSaveModal: false }))}
        title="Restore Previous Session?"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Found auto-saved data from a previous session. Would you like to restore it?
          </Text>

          <Group grow>
            <Button
              onClick={handleRestoreAutoSave}
              color={UI_STYLES.COLORS.PRIMARY}
              style={{ borderColor: UI_STYLES.COLORS.PRIMARY }}
            >
              Restore
            </Button>
            <Button
              onClick={handleDiscardAutoSave}
              variant="light"
              color="red"
            >
              Discard
            </Button>
          </Group>
        </Stack>
      </Modal>
    </MantineProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);



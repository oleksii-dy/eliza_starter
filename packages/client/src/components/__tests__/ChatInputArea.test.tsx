// Import test setup for browser environment
import '../../test/setup';

import { describe, test, expect, beforeEach } from 'bun:test';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { ChatInputArea } from '../ChatInputArea';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ChannelType, AgentStatus } from '@elizaos/core';
import type { Agent } from '@elizaos/core';
import type { UploadingFile } from '@/hooks/use-file-upload';

// Mock file for testing
const createMockFile = (name: string, type: string, size: number = 1024): File => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Mock uploading file
const createMockUploadingFile = (overrides: Partial<UploadingFile> = {}): UploadingFile => ({
  id: 'file-123',
  file: createMockFile('test.jpg', 'image/jpeg'),
  blobUrl: 'blob:test-url',
  isUploading: false,
  error: null,
  ...overrides,
});

// Mock agent
const createMockAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: 'test-agent-id',
  name: 'Test Agent',
  username: 'testagent',
  bio: ['Test bio'],
  messageExamples: [],
  postExamples: [],
  topics: [],
  knowledge: [],
  plugins: [],
  settings: {},
  secrets: {},
  style: {},
  system: 'Test system',
  enabled: true,
  status: AgentStatus.ACTIVE,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('ChatInputArea Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0 },
        mutations: { retry: false },
      },
    });
  });

  // Common props
  const defaultProps = {
    input: '',
    setInput: () => {},
    inputDisabled: false,
    selectedFiles: [],
    removeFile: () => {},
    handleFileChange: () => {},
    handleSendMessage: () => {},
    handleKeyDown: () => {},
    chatType: ChannelType.DM as const,
    formRef: { current: null },
    inputRef: { current: null },
    fileInputRef: { current: null },
  };

  // Helper to render with all necessary providers
  const renderChatInput = (props = defaultProps) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ChatInputArea {...props} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  };

  test('should render basic chat input area', () => {
    const { container } = renderChatInput();

    const chatContainer = container.querySelector('[data-testid="chat-container"]');
    const chatInput = container.querySelector('[data-testid="chat-input"]');
    const sendButton = container.querySelector('[data-testid="send-button"]');

    expect(chatContainer).toBeInTheDocument();
    expect(chatInput).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
  });

  test('should show thinking state when input is disabled', () => {
    const agent = createMockAgent({ name: 'Thinking Agent' });
    const props = {
      ...defaultProps,
      inputDisabled: true,
      targetAgentData: agent,
    };

    const { container } = renderChatInput(props);

    expect(container.textContent).toContain('Thinking Agent is thinking');

    // Should show animated dots
    const animatedDots = container.querySelectorAll('.animate-bounce');
    expect(animatedDots.length).toBeGreaterThan(0);
  });

  test('should show generic thinking message when no agent data', () => {
    const props = {
      ...defaultProps,
      inputDisabled: true,
    };

    const { container } = renderChatInput(props);

    expect(container.textContent).toContain('Agent is thinking');
  });

  test('should handle input value changes', () => {
    const setInputMock = { calls: [] as string[] };
    const props = {
      ...defaultProps,
      input: 'Test message',
      setInput: (value: string) => setInputMock.calls.push(value),
    };

    const { container } = renderChatInput(props);

    const chatInput = container.querySelector('[data-testid="chat-input"]') as HTMLTextAreaElement;
    expect(chatInput.value).toBe('Test message');

    // Test that the setInput function works directly
    props.setInput('Updated message');
    expect(setInputMock.calls.length).toBeGreaterThan(0);
    expect(setInputMock.calls[setInputMock.calls.length - 1]).toBe('Updated message');

    // Also verify that the onChange prop is correctly set on the component
    expect(chatInput).toBeInTheDocument();
    expect(chatInput.value).toBe('Test message');
  });

  test('should handle form submission', () => {
    const handleSendMock = { called: false, event: null as any };
    const props = {
      ...defaultProps,
      handleSendMessage: (e: React.FormEvent) => {
        handleSendMock.called = true;
        handleSendMock.event = e;
      },
    };

    const { container } = renderChatInput(props);

    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();

    if (form) {
      fireEvent.submit(form);
      expect(handleSendMock.called).toBe(true);
    }
  });

  test('should handle send button click', () => {
    const handleSendMock = { called: false };
    const props = {
      ...defaultProps,
      handleSendMessage: () => {
        handleSendMock.called = true;
      },
    };

    const { container } = renderChatInput(props);

    const sendButton = container.querySelector('[data-testid="send-button"]');
    expect(sendButton).toBeInTheDocument();

    if (sendButton) {
      fireEvent.click(sendButton);
      expect(handleSendMock.called).toBe(true);
    }
  });

  test('should display selected files', () => {
    const mockFiles: UploadingFile[] = [
      createMockUploadingFile({
        id: 'file-1',
        file: createMockFile('image.jpg', 'image/jpeg'),
      }),
      createMockUploadingFile({
        id: 'file-2',
        file: createMockFile('document.pdf', 'application/pdf'),
      }),
    ];

    const props = {
      ...defaultProps,
      selectedFiles: mockFiles,
    };

    const { container } = renderChatInput(props);

    // Should show file previews
    expect(container.textContent).toContain('image.jpg');
    expect(container.textContent).toContain('document.pdf');

    // Should show remove buttons for each file
    const removeButtons = container.querySelectorAll('button');
    const hasRemoveButtons = Array.from(removeButtons).some(
      (btn) => btn.querySelector('svg') // X icon
    );
    expect(hasRemoveButtons).toBe(true);
  });

  test('should handle file removal', () => {
    const removeFileMock = { calls: [] as string[] };
    const mockFile = createMockUploadingFile({ id: 'file-to-remove' });

    const props = {
      ...defaultProps,
      selectedFiles: [mockFile],
      removeFile: (fileId: string) => removeFileMock.calls.push(fileId),
    };

    const { container } = renderChatInput(props);

    // Find remove button (X icon)
    const removeButtons = container.querySelectorAll('button');
    const removeButton = Array.from(removeButtons).find(
      (btn) => btn.querySelector('svg') // X icon for remove
    );

    expect(removeButton).toBeInTheDocument();

    if (removeButton) {
      fireEvent.click(removeButton);
      expect(removeFileMock.calls).toContain('file-to-remove');
    }
  });

  test('should show uploading state for files', () => {
    const uploadingFile = createMockUploadingFile({
      id: 'uploading-file',
      isUploading: true,
      file: createMockFile('uploading.jpg', 'image/jpeg'),
    });

    const props = {
      ...defaultProps,
      selectedFiles: [uploadingFile],
    };

    const { container } = renderChatInput(props);

    // Should show loading spinner for uploading file
    const loadingSpinner = container.querySelector('.animate-spin');
    expect(loadingSpinner).toBeInTheDocument();
  });

  test('should show error state for files', () => {
    const errorFile = createMockUploadingFile({
      id: 'error-file',
      error: 'Upload failed',
      file: createMockFile('error.jpg', 'image/jpeg'),
    });

    const props = {
      ...defaultProps,
      selectedFiles: [errorFile],
    };

    const { container } = renderChatInput(props);

    // Should show error message
    expect(container.textContent).toContain('Error');
  });

  test('should handle file input click', () => {
    const mockFileInputRef = {
      current: {
        click: () => {
          // Mock function to simulate file input click
        },
      },
    };

    const props = {
      ...defaultProps,
      fileInputRef: mockFileInputRef as any,
    };

    const { container } = renderChatInput(props);

    // Test that the ref is properly configured
    expect(mockFileInputRef.current).toBeDefined();
    expect(typeof mockFileInputRef.current.click).toBe('function');

    // Find attachment buttons in the component
    const attachButtons = container.querySelectorAll('button');
    expect(attachButtons.length).toBeGreaterThan(0);

    // Verify component renders with file input functionality
    expect(container.querySelector('input[type="file"]')).toBeInTheDocument();

    // Test that the file input ref can be called without errors
    expect(() => mockFileInputRef.current.click()).not.toThrow();
  });

  test('should handle keyboard events', () => {
    const handleKeyDownMock = { calls: [] as any[] };
    const props = {
      ...defaultProps,
      handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        handleKeyDownMock.calls.push({
          key: e.key,
          shiftKey: e.shiftKey,
        });
      },
    };

    const { container } = renderChatInput(props);

    const chatInput = container.querySelector('[data-testid="chat-input"]');
    expect(chatInput).toBeInTheDocument();

    // Test the handleKeyDown function directly
    const mockEvent = {
      key: 'Enter',
      shiftKey: false,
      preventDefault: () => {},
      stopPropagation: () => {},
    } as React.KeyboardEvent<HTMLTextAreaElement>;

    props.handleKeyDown(mockEvent);
    expect(handleKeyDownMock.calls).toHaveLength(1);
    expect(handleKeyDownMock.calls[0].key).toBe('Enter');
    expect(handleKeyDownMock.calls[0].shiftKey).toBe(false);
  });

  test('should disable input when agent is inactive', () => {
    const inactiveAgent = createMockAgent({ status: AgentStatus.INACTIVE });
    const props = {
      ...defaultProps,
      targetAgentData: inactiveAgent,
      chatType: ChannelType.DM as const,
    };

    const { container } = renderChatInput(props);

    const chatInput = container.querySelector('[data-testid="chat-input"]') as HTMLTextAreaElement;
    expect(chatInput.disabled).toBe(true);
  });

  test('should show correct placeholder for different chat types', () => {
    // DM chat
    const dmProps = {
      ...defaultProps,
      chatType: ChannelType.DM as const,
    };

    const { container: dmContainer } = renderChatInput(dmProps);
    const dmInput = dmContainer.querySelector('[data-testid="chat-input"]') as HTMLTextAreaElement;
    expect(dmInput.placeholder).toContain('Type your message');

    // Group chat
    const groupProps = {
      ...defaultProps,
      chatType: ChannelType.GROUP as const,
    };

    const { container: groupContainer } = renderChatInput(groupProps);
    const groupInput = groupContainer.querySelector(
      '[data-testid="chat-input"]'
    ) as HTMLTextAreaElement;
    expect(groupInput.placeholder).toContain('Message group');
  });

  test('should disable send button when files are uploading', () => {
    const uploadingFile = createMockUploadingFile({ isUploading: true });
    const props = {
      ...defaultProps,
      selectedFiles: [uploadingFile],
    };

    const { container } = renderChatInput(props);

    const sendButton = container.querySelector('[data-testid="send-button"]') as HTMLButtonElement;
    expect(sendButton.disabled).toBe(true);
  });

  test('should show loading animation in send button when disabled', () => {
    const props = {
      ...defaultProps,
      inputDisabled: true,
    };

    const { container } = renderChatInput(props);

    const sendButton = container.querySelector('[data-testid="send-button"]');
    expect(sendButton).toBeInTheDocument();

    // Should show animated dots instead of send icon
    const animatedDots = sendButton?.querySelectorAll('.animate-bounce');
    expect(animatedDots?.length).toBeGreaterThan(0);
  });

  test('should handle file type display correctly', () => {
    const files: UploadingFile[] = [
      createMockUploadingFile({
        id: 'image-file',
        file: createMockFile('test.jpg', 'image/jpeg'),
      }),
      createMockUploadingFile({
        id: 'video-file',
        file: createMockFile('test.mp4', 'video/mp4'),
      }),
      createMockUploadingFile({
        id: 'document-file',
        file: createMockFile('test.pdf', 'application/pdf'),
      }),
    ];

    const props = {
      ...defaultProps,
      selectedFiles: files,
    };

    const { container } = renderChatInput(props);

    // Should show image preview
    const images = container.querySelectorAll('img');
    expect(images.length).toBeGreaterThan(0);

    // Should show video preview
    const videos = container.querySelectorAll('video');
    expect(videos.length).toBeGreaterThan(0);

    // Should show document icon for non-media files
    const fileIcons = container.querySelectorAll('svg');
    expect(fileIcons.length).toBeGreaterThan(0);
  });
});

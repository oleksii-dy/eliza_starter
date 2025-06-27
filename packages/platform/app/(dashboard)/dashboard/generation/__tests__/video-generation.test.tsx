/**
 * Video Generation Page Tests
 * Component tests for video generation interface
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VideoGenerationPage from '../video/page';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: '/dashboard/generation/video',
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

// Mock the cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

describe('VideoGenerationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for API calls
    const mockFetch = vi.fn() as any;
    mockFetch.preconnect = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the video generation interface', () => {
    render(<VideoGenerationPage />);

    expect(screen.getByText('Video Generation')).toBeInTheDocument();
    expect(
      screen.getByText('Create dynamic videos from text descriptions'),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/A serene mountain landscape/),
    ).toBeInTheDocument();
    expect(screen.getByText('Generate Video')).toBeInTheDocument();
  });

  it('should render all video style options', () => {
    render(<VideoGenerationPage />);

    expect(screen.getByText('Cinematic')).toBeInTheDocument();
    expect(screen.getByText('Anime')).toBeInTheDocument();
    expect(screen.getByText('Realistic')).toBeInTheDocument();
    expect(screen.getByText('Artistic')).toBeInTheDocument();
    expect(screen.getByText('Cartoon')).toBeInTheDocument();
  });

  it('should allow selecting video styles', () => {
    render(<VideoGenerationPage />);

    const animeButton = screen.getByText('Anime');
    fireEvent.click(animeButton);

    // Check if the anime style is selected (would need to check CSS classes in real implementation)
    expect(animeButton.closest('button')).toHaveClass(/purple/);
  });

  it('should update prompt when typing', () => {
    render(<VideoGenerationPage />);

    const promptInput = screen.getByPlaceholderText(
      /A serene mountain landscape/,
    ) as HTMLTextAreaElement;
    fireEvent.change(promptInput, {
      target: { value: 'A beautiful sunset over the ocean' },
    });

    expect(promptInput.value).toBe('A beautiful sunset over the ocean');
  });

  it('should update motion prompt when typing', () => {
    render(<VideoGenerationPage />);

    const motionInput = screen.getByPlaceholderText(
      /Camera pans slowly/,
    ) as HTMLTextAreaElement;
    fireEvent.change(motionInput, {
      target: { value: 'Waves crash gently on the shore' },
    });

    expect(motionInput.value).toBe('Waves crash gently on the shore');
  });

  it('should disable generate button when prompt is empty', () => {
    render(<VideoGenerationPage />);

    const generateButton = screen.getByText('Generate Video');
    expect(generateButton).toBeDisabled();
  });

  it('should enable generate button when prompt is filled', () => {
    render(<VideoGenerationPage />);

    const promptInput = screen.getByPlaceholderText(
      /A serene mountain landscape/,
    );
    fireEvent.change(promptInput, {
      target: { value: 'A beautiful landscape' },
    });

    const generateButton = screen.getByText('Generate Video');
    expect(generateButton).not.toBeDisabled();
  });

  it('should show settings panel when settings button is clicked', () => {
    render(<VideoGenerationPage />);

    const settingsButton = screen.getByRole('button', { name: '' }); // Gear icon button
    fireEvent.click(settingsButton);

    expect(screen.getByText('Video Settings')).toBeInTheDocument();
    expect(screen.getByText('Model')).toBeInTheDocument();
    expect(screen.getByText('Frame Rate')).toBeInTheDocument();
  });

  it('should update settings when changed', () => {
    render(<VideoGenerationPage />);

    // Open settings
    const settingsButton = screen.getByRole('button', { name: '' });
    fireEvent.click(settingsButton);

    // Change model
    const modelSelect = screen.getByDisplayValue('google-veo');
    fireEvent.change(modelSelect, { target: { value: 'runwayml' } });

    expect(modelSelect).toHaveValue('runwayml');
  });

  it('should update cost estimate when duration changes', () => {
    render(<VideoGenerationPage />);

    const durationSelect = screen.getByDisplayValue('5 seconds');
    fireEvent.change(durationSelect, { target: { value: '10' } });

    expect(screen.getByText('Est. cost: $1.50')).toBeInTheDocument();
  });

  it('should show aspect ratio options', () => {
    render(<VideoGenerationPage />);

    expect(screen.getByText('Landscape (16:9)')).toBeInTheDocument();
    expect(screen.getByText('Portrait (9:16)')).toBeInTheDocument();
    expect(screen.getByText('Square (1:1)')).toBeInTheDocument();
  });

  it('should start generation process when generate button is clicked', async () => {
    render(<VideoGenerationPage />);

    // Fill prompt
    const promptInput = screen.getByPlaceholderText(
      /A serene mountain landscape/,
    );
    fireEvent.change(promptInput, { target: { value: 'A beautiful sunset' } });

    // Click generate
    const generateButton = screen.getByText('Generate Video');
    fireEvent.click(generateButton);

    // Should show generating state
    expect(screen.getByText('Generating...')).toBeInTheDocument();
    expect(generateButton).toBeDisabled();
  });

  it('should show processing state during generation', async () => {
    render(<VideoGenerationPage />);

    // Fill prompt and generate
    const promptInput = screen.getByPlaceholderText(
      /A serene mountain landscape/,
    );
    fireEvent.change(promptInput, { target: { value: 'A beautiful sunset' } });

    const generateButton = screen.getByText('Generate Video');
    fireEvent.click(generateButton);

    // Should show processing video
    await waitFor(() => {
      expect(screen.getByText('Processing video...')).toBeInTheDocument();
    });
  });

  it('should show completed video after processing', async () => {
    render(<VideoGenerationPage />);

    // Fill prompt and generate
    const promptInput = screen.getByPlaceholderText(
      /A serene mountain landscape/,
    );
    fireEvent.change(promptInput, { target: { value: 'A beautiful sunset' } });

    const generateButton = screen.getByText('Generate Video');
    fireEvent.click(generateButton);

    // Wait for completion (mock resolves after timeout)
    await waitFor(
      () => {
        expect(screen.getByText('completed')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });

  it('should show empty state when no videos generated', () => {
    render(<VideoGenerationPage />);

    expect(screen.getByText('No videos generated yet')).toBeInTheDocument();
    expect(
      screen.getByText('Enter a prompt above to start creating videos'),
    ).toBeInTheDocument();
  });

  it('should handle download button click', async () => {
    // Mock document.createElement and methods
    const mockAnchor = {
      href: '',
      download: '',
      target: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockImplementation(
      () => mockAnchor as any,
    );
    vi.spyOn(document.body, 'appendChild').mockImplementation(
      () => mockAnchor as any,
    );
    vi.spyOn(document.body, 'removeChild').mockImplementation(
      () => mockAnchor as any,
    );

    render(<VideoGenerationPage />);

    // Generate a video first
    const promptInput = screen.getByPlaceholderText(
      /A serene mountain landscape/,
    );
    fireEvent.change(promptInput, { target: { value: 'A beautiful sunset' } });

    const generateButton = screen.getByText('Generate Video');
    fireEvent.click(generateButton);

    // Wait for completion
    await waitFor(
      () => {
        expect(screen.getByText('completed')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    // Find and click download button
    const downloadButton =
      document.querySelector('[aria-label="Download"]') ||
      document.querySelector('button[class*="absolute top-2 right-2"]');

    if (downloadButton) {
      fireEvent.click(downloadButton);
      expect(mockAnchor.click).toHaveBeenCalled();
    }
  });

  it('should toggle video playback when play button is clicked', async () => {
    render(<VideoGenerationPage />);

    // Generate a video first
    const promptInput = screen.getByPlaceholderText(
      /A serene mountain landscape/,
    );
    fireEvent.change(promptInput, { target: { value: 'A beautiful sunset' } });

    const generateButton = screen.getByText('Generate Video');
    fireEvent.click(generateButton);

    // Wait for completion
    await waitFor(
      () => {
        expect(screen.getByText('completed')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    // Find play button (would be in the video thumbnail)
    const playButton = document.querySelector('button[class*="bg-white/90"]');

    if (playButton) {
      fireEvent.click(playButton);
      // Video should be playing (would show video element instead of thumbnail)
      await waitFor(() => {
        expect(document.querySelector('video')).toBeInTheDocument();
      });
    }
  });

  it('should validate required fields before generation', () => {
    render(<VideoGenerationPage />);

    const generateButton = screen.getByText('Generate Video');

    // Button should be disabled without prompt
    expect(generateButton).toBeDisabled();

    // Add prompt
    const promptInput = screen.getByPlaceholderText(
      /A serene mountain landscape/,
    );
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });

    // Button should be enabled
    expect(generateButton).not.toBeDisabled();

    // Clear prompt
    fireEvent.change(promptInput, { target: { value: '' } });

    // Button should be disabled again
    expect(generateButton).toBeDisabled();
  });

  it('should show generation details in results', async () => {
    render(<VideoGenerationPage />);

    // Generate a video
    const promptInput = screen.getByPlaceholderText(
      /A serene mountain landscape/,
    );
    fireEvent.change(promptInput, {
      target: { value: 'A beautiful sunset over mountains' },
    });

    const generateButton = screen.getByText('Generate Video');
    fireEvent.click(generateButton);

    // Wait for processing to start
    await waitFor(() => {
      expect(screen.getByText('Processing video...')).toBeInTheDocument();
    });

    // Should show the prompt in results
    expect(
      screen.getByText('A beautiful sunset over mountains'),
    ).toBeInTheDocument();

    // Should show model and duration
    expect(screen.getByText(/google-veo • 5s/)).toBeInTheDocument();

    // Should show cost
    expect(screen.getByText('$0.75')).toBeInTheDocument();
  });
});

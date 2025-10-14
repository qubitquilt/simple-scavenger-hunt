import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChallengeView from '@/components/ChallengeView';
import { useRouter } from 'next/navigation';

import type { Question } from '@/types/question';
import type { Event } from '@/types/admin';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: mockPush })),
}));

const mockQuestionWithTitle: Question = {
  id: 'q1',
  eventId: 'e1',
  type: 'text',
  title: 'Test Title',
  content: 'Test Content',
  expectedAnswer: 'test',
  aiThreshold: 8,
  hintEnabled: true,
  createdAt: '2025-01-01T00:00:00Z',
};

const mockQuestionWithoutTitle: Question = {
  id: 'q2',
  eventId: 'e1',
  type: 'text',
  title: '',
  content: 'Test Content Only',
  expectedAnswer: 'test',
  aiThreshold: 8,
  hintEnabled: true,
  createdAt: '2025-01-01T00:00:00Z',
};

const mockEvent: Event = {
  id: 'e1',
  title: 'Test Event',
  slug: 'test-event',
  description: 'A test event',
  date: new Date('2025-01-01T00:00:00Z'),
  createdAt: new Date('2025-01-01T00:00:00Z'),
};

global.fetch = jest.fn();

describe('ChallengeView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ answer: null }),
    });
  });

  test('renders loading state initially', () => {
    render(<ChallengeView question={mockQuestionWithTitle} event={mockEvent} />);
    expect(screen.getByText(/loading challenge/i)).toBeInTheDocument();
  });

  test('renders error state', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Failed to load answer status' }),
    });
    render(<ChallengeView question={mockQuestionWithTitle} event={mockEvent} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load answer status')).toBeInTheDocument();
    });
  });

  test.skip('renders completed state', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ answer: { status: 'correct' } }),
    });
    render(<ChallengeView question={mockQuestionWithTitle} event={mockEvent} />);

    await waitFor(() => {
      expect(screen.getByText('Your submission:')).toBeInTheDocument();
    });
  });

  test.skip('renders title as h1 and content separately when both present', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ answer: null }),
    });
    render(<ChallengeView question={mockQuestionWithTitle} event={mockEvent} />);

    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Test Title');
      // Content is rendered in the card body, assuming it's in a p or div
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  test('renders content as h1 when title is missing (backward compatibility)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ answer: null }),
    });
    render(<ChallengeView question={mockQuestionWithoutTitle} event={mockEvent} />);

    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Test Content Only');
      // No separate content display since title is empty
    });
  });

  test.skip('handles text answer submission with both title and content', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ answer: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accepted: false }),
      });

    render(<ChallengeView question={mockQuestionWithTitle} event={mockEvent} />);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'test answer');
    await user.click(screen.getByRole('button', { name: /submit answer/i }));

    expect(global.fetch).toHaveBeenCalledWith('/api/answers', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        questionId: 'q1',
        submission: 'test answer',
      }),
    }));
  });
});
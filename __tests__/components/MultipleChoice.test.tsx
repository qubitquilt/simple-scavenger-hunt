import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChallengeView from '@/components/ChallengeView';
import { QuestionType } from '@/types/question';
import type { Question } from '@/types/question';
import type { Event } from '@/types/admin';

global.fetch = jest.fn();

const mockEvent: Event = {
  id: '1',
  title: 'Test Event',
  slug: 'test-event',
  description: 'Test Description',
  questionCount: 3,
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  isActive: true,
  createdAt: '2024-01-01',
};

const mockMcQuestion: Question = {
  id: '1',
  eventId: '1',
  type: QuestionType.MULTIPLE_CHOICE,
  title: 'Test Multiple Choice Question',
  content: 'What is your favorite color?',
  options: { a: 'Red', b: 'Blue', c: 'Green' },
  expectedAnswer: 'Blue',
  aiThreshold: 0,
  hintEnabled: false,
  createdAt: '2024-01-01',
};

describe('Multiple Choice Question Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows selecting a radio option and submitting successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ answer: null }),
    });

    render(<ChallengeView question={mockMcQuestion} event={mockEvent} />);

    await waitFor(() => {
      expect(screen.getByText('Test Multiple Choice Question')).toBeInTheDocument();
    });

    const user = userEvent.setup();

    const blueOption = screen.getByLabelText('Blue');
    await user.click(blueOption);

    expect(blueOption).toBeChecked();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ accepted: true, status: 'accepted' }),
    });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/answers',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Blue'),
        })
      );
    });
  });

  it('shows validation error when no option is selected', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ answer: null }),
    });

    render(<ChallengeView question={mockMcQuestion} event={mockEvent} />);

    await waitFor(() => {
      expect(screen.getByText('Test Multiple Choice Question')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please select an option')).toBeInTheDocument();
    });
  });
});
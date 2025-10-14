import { render, screen } from '@testing-library/react';
import QuestionCard from '@/components/QuestionCard';
import type { QuestionWithStatus } from '@/components/QuestionCard';
import type { AnswerStatus } from '@/types/answer';
import { QuestionType } from '@/types/question';

describe('QuestionCard', () => {
  const mockQuestionWithTitle: QuestionWithStatus = {
    id: 'test-id',
    slug: 'test-slug',
    type: QuestionType.TEXT,
    title: 'Test Title',
    content: 'Test Content',
    eventId: 'test-event',
    expectedAnswer: 'test-answer',
    aiThreshold: 0.8,
    hintEnabled: true,
    createdAt: '2025-01-01T00:00:00Z',
    computedStatus: null,
  };

  const mockQuestionWithoutTitle: QuestionWithStatus = {
    id: 'test-id-no-title',
    slug: 'test-slug-no-title',
    type: QuestionType.TEXT,
    title: '',
    content: 'Test Content Only',
    eventId: 'test-event',
    expectedAnswer: 'test-answer',
    aiThreshold: 0.8,
    hintEnabled: true,
    createdAt: '2025-01-01T00:00:00Z',
    computedStatus: null,
  };

  test('renders title and content separately when both present', () => {
    render(<QuestionCard question={mockQuestionWithTitle} />);

    const titleElement = screen.getByRole('heading');
    expect(titleElement).toHaveTextContent('Test Title');

    const contentElement = screen.getByText('Test Content');
    expect(contentElement).toBeInTheDocument();
  });

  test('renders content as title when title is missing (backward compatibility)', () => {
    render(<QuestionCard question={mockQuestionWithoutTitle} />);

    const titleElement = screen.getByRole('heading');
    expect(titleElement).toHaveTextContent('Test Content Only');

    // No separate content preview since title is empty
    expect(screen.queryByText('Test Content Only', { selector: 'p' })).not.toBeInTheDocument();
  });

  test('renders content preview when title and content both present and content is long', () => {
    const longContentQuestion: QuestionWithStatus = {
      ...mockQuestionWithTitle,
      content: 'This is a very long content that should be truncated to 100 characters for preview...',
    };

    render(<QuestionCard question={longContentQuestion} />);

    const titleElement = screen.getByRole('heading');
    expect(titleElement).toHaveTextContent('Test Title');

    const previewElement = screen.getByText('This is a very long content that should be truncated to 100 characters for preview...');
    expect(previewElement).toBeInTheDocument();
  });

  test.skip('renders status badge for accepted status', () => {
    const acceptedQuestion = { ...mockQuestionWithTitle, computedStatus: 'accepted' as AnswerStatus };
    render(<QuestionCard question={acceptedQuestion} />);

    const badge = screen.getByText('✓ accepted');
    expect(badge).toBeInTheDocument();
  });

  test.skip('renders status badge for rejected status', () => {
    const rejectedQuestion = { ...mockQuestionWithTitle, computedStatus: 'rejected' as AnswerStatus };
    render(<QuestionCard question={rejectedQuestion} />);

    const badge = screen.getByText('✗ rejected');
    expect(badge).toBeInTheDocument();
  });
});

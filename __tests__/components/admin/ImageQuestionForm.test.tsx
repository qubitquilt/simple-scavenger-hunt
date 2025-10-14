import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageQuestionForm from '@/components/admin/ImageQuestionForm';
import { useForm } from 'react-hook-form';

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(() => ({
    register: jest.fn(),
    handleSubmit: jest.fn((fn) => fn),
    formState: { errors: {} },
    watch: jest.fn(),
    setValue: jest.fn(),
  })),
}));

const mockOnSubmit = jest.fn();
const mockUser = userEvent.setup();

describe('ImageQuestionForm', () => {
  const defaultProps = {
    onSubmit: mockOnSubmit,
    eventId: 'test-event',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useForm as jest.Mock).mockReturnValue({
      register: jest.fn((name) => [jest.fn(), jest.fn()]),
      handleSubmit: jest.fn((fn) => async (data) => fn(data)),
      formState: { errors: {} },
      watch: jest.fn(() => ({})),
      setValue: jest.fn(),
    });
  });

  test('renders title and content input fields separately', () => {
    render(<ImageQuestionForm {...defaultProps} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/content/i)).toBeInTheDocument();
  });

  test('submits form with both title and content fields', async () => {
    const mockRegister = jest.fn((name) => [jest.fn(), jest.fn()]);
    (useForm as jest.Mock).mockReturnValue({
      register: mockRegister,
      handleSubmit: jest.fn((fn) => async (data) => fn(data)),
      formState: { errors: {} },
      watch: jest.fn(() => ({})),
      setValue: jest.fn(),
    });

    render(<ImageQuestionForm {...defaultProps} />);

    const titleInput = screen.getByLabelText(/title/i);
    const contentInput = screen.getByLabelText(/content/i);

    await mockUser.type(titleInput, 'Test Title');
    await mockUser.type(contentInput, 'Test Content');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await mockUser.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'Test Title',
      content: 'Test Content',
      // other fields...
    });
  });

  test('handles form with missing title (backward compatibility)', async () => {
    const mockRegister = jest.fn((name) => [jest.fn(), jest.fn()]);
    (useForm as jest.Mock).mockReturnValue({
      register: mockRegister,
      handleSubmit: jest.fn((fn) => async (data) => fn(data)),
      formState: { errors: {} },
      watch: jest.fn(() => ({ title: '' })),
      setValue: jest.fn(),
    });

    render(<ImageQuestionForm {...defaultProps} initialData={{ content: 'Fallback Content' }} />);

    const contentInput = screen.getByLabelText(/content/i);
    expect(contentInput).toHaveValue('Fallback Content');

    // Title input should be empty
    const titleInput = screen.getByLabelText(/title/i);
    expect(titleInput).toHaveValue('');

    // Submission should use content as fallback if needed, but since it's creation, just test fields are present
  });
});
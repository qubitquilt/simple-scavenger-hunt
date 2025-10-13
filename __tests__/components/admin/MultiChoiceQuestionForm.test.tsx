import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import MultiChoiceQuestionForm from '@/components/admin/MultiChoiceQuestionForm'
import { createQuestionSchema, CreateQuestion } from '@/lib/validation'

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(() => ({
    register: jest.fn(() => ({ onChange: jest.fn(), onBlur: jest.fn(), name: 'field' })),
    handleSubmit: jest.fn((fn) => async (e: any) => {
      e.preventDefault()
      return fn({})
    }),
    formState: {
      errors: {},
      isDirty: false,
    },
    watch: jest.fn(() => ({
      A: '',
      B: '',
      C: '',
      D: '',
    })),
    setValue: jest.fn(),
    trigger: jest.fn(),
  })),
  type: { Resolver: jest.fn() },
}))

// Mock zod resolver
jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: jest.fn(() => jest.fn()),
}))

// Mock validation schema
jest.mock('@/lib/validation', () => ({
  createQuestionSchema: {
    parse: jest.fn((data) => data),
    safeParse: jest.fn((data) => ({ success: true, data })),
  },
  CreateQuestion: jest.fn(),
}))

const mockOnSubmit = jest.fn()
const mockUser = userEvent.setup()

describe('MultiChoiceQuestionForm', () => {
  const defaultProps = {
    initialData: undefined,
    onSubmit: mockOnSubmit,
    eventId: 'test-event',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const mockRegister = jest.fn((name: string) => ({
      ref: jest.fn(),
      onChange: jest.fn(),
      onBlur: jest.fn(),
      name,
    }))
    require('react-hook-form').useForm.mockReturnValue({
      register: mockRegister,
      handleSubmit: jest.fn((fn) => async (e: any) => {
        e.preventDefault()
        const data = {
          eventId: 'test-event',
          type: 'multiple_choice',
          content: '',
          expectedAnswer: '',
          options: { A: '', B: '', C: '', D: '' },
          aiThreshold: 8,
          hintEnabled: false,
        }
        require('@/lib/validation').createQuestionSchema.safeParse.mockReturnValue({ success: true, data })
        return fn(data)
      }),
      formState: { errors: {}, isDirty: false },
      watch: jest.fn(() => ({ A: '', B: '', C: '', D: '' })),
      setValue: jest.fn(),
      trigger: jest.fn(() => Promise.resolve(true)),
    })
    require('@hookform/resolvers/zod').zodResolver.mockReturnValue(jest.fn())
  })

  it('renders form inputs', () => {
    render(<MultiChoiceQuestionForm {...defaultProps} />)

    expect(screen.getByLabelText(/question content/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/options/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/expected answer/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ai threshold/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/enable hints/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('shows validation errors on submit with invalid data', async () => {
    const mockFormState = {
      errors: {
        content: { message: 'Content required' },
        expectedAnswer: { message: 'Expected answer required' },
        options: { A: { message: 'Option A required' } },
      },
      isDirty: true,
    }
  
    require('react-hook-form').useForm.mockReturnValue({
      register: jest.fn((name: string) => ({
        ref: jest.fn(),
        onChange: jest.fn(),
        onBlur: jest.fn(),
        name,
      })),
      handleSubmit: jest.fn((fn) => async (e: any) => {
        e.preventDefault()
        // Simulate validation failure, don't call onSubmit
        return
      }),
      formState: mockFormState,
      watch: jest.fn(() => ({ A: '', B: '', C: '', D: '' })),
      setValue: jest.fn(),
      trigger: jest.fn(() => Promise.resolve(false)),
    })
  
    require('@/lib/validation').createQuestionSchema.safeParse.mockReturnValue({
      success: false,
      error: { issues: [{ message: 'Content required' }] },
    })
  
    render(<MultiChoiceQuestionForm {...defaultProps} />)
  
    await mockUser.click(screen.getByRole('button', { name: /submit/i }))
  
    await waitFor(() => {
      expect(screen.getByText(/content required/i)).toBeInTheDocument()
      expect(screen.getByText(/expected answer required/i)).toBeInTheDocument()
      expect(screen.getByText(/option a required/i)).toBeInTheDocument()
    })
  })

  it('calls onSubmit with valid data', async () => {
    const validData: CreateQuestion = {
      eventId: 'test-event',
      type: 'multiple_choice',
      content: 'What is 2+2?',
      expectedAnswer: 'A',
      options: { A: '4', B: '5', C: '3', D: '6' },
      aiThreshold: 8,
      hintEnabled: false,
    }

    require('react-hook-form').useForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn((fn) => async () => fn(validData)),
      formState: { errors: {}, isDirty: true },
      watch: jest.fn(() => validData.options),
    })

    render(<MultiChoiceQuestionForm {...defaultProps} />)

    await mockUser.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(validData)
    })
  })

  it('updates expectedAnswer options dynamically when options change', async () => {
    const { rerender } = render(<MultiChoiceQuestionForm {...defaultProps} />)

    const optionAInput = screen.getByTestId('option-a-input')
    const optionBInput = screen.getByTestId('option-b-input')

    await mockUser.type(optionAInput, 'Option A text')
    await mockUser.type(optionBInput, 'Option B text')

    // Update mock to simulate watch returning new values
    const updatedWatch = jest.fn(() => ({ A: 'Option A text', B: 'Option B text', C: '', D: '' }))
    require('react-hook-form').useForm.mockReturnValue({
      register: jest.fn((name) => ({ onChange: jest.fn(), onBlur: jest.fn(), name })),
      handleSubmit: jest.fn((fn) => async (e: any) => {
        e.preventDefault()
        const data = {
          eventId: 'test-event',
          type: 'multiple_choice',
          content: '',
          expectedAnswer: '',
          options: { A: 'Option A text', B: 'Option B text', C: '', D: '' },
          aiThreshold: 8,
          hintEnabled: false,
        }
        require('@/lib/validation').createQuestionSchema.safeParse.mockReturnValue({ success: true, data })
        return fn(data)
      }),
      formState: { errors: {}, isDirty: false },
      watch: updatedWatch,
      setValue: jest.fn(),
      trigger: jest.fn(() => Promise.resolve(true)),
    })

    rerender(<MultiChoiceQuestionForm {...defaultProps} />)

    await waitFor(() => {
      const optionA = screen.getByRole('option', { name: /A: Option A text/i })
      expect(optionA).toBeInTheDocument()
      const optionB = screen.getByRole('option', { name: /B: Option B text/i })
      expect(optionB).toBeInTheDocument()
    })
  })

  it('handles edge case with empty options', async () => {
    require('react-hook-form').useForm.mockReturnValue({
      ...require('react-hook-form').useForm(),
      watch: jest.fn(() => ({ A: '', B: '', C: '', D: '' })),
    })

    render(<MultiChoiceQuestionForm {...defaultProps} />)

    const select = screen.getByRole('combobox', { name: /expected answer/i })
    expect(select).toHaveTextContent('Select an option')
    expect(select.children).toHaveLength(1) // Only default option
  })

  it('handles mismatched expectedAnswer', async () => {
    const invalidData = {
      ...defaultProps,
      initialData: {
        options: { A: 'Valid', B: 'Valid' },
        expectedAnswer: 'C', // Mismatch
      },
    }
  
    const mockFormState = {
      errors: {
        expectedAnswer: { message: 'Expected answer must match an option key' },
      },
      isDirty: false,
    }
  
    const mockRegister = jest.fn((name: string) => ({
      ref: jest.fn(),
      onChange: jest.fn(),
      onBlur: jest.fn(),
      name,
    }))
  
    const mockWatch = jest.fn(() => ({ A: 'Valid', B: 'Valid', C: '', D: '' }))
  
    require('react-hook-form').useForm.mockReturnValue({
      register: mockRegister,
      handleSubmit: jest.fn((fn) => async (e: any) => {
        e.preventDefault()
        const data = {
          eventId: 'test-event',
          type: 'multiple_choice',
          content: '',
          expectedAnswer: 'C',
          options: { A: 'Valid', B: 'Valid', C: '', D: '' },
          aiThreshold: 8,
          hintEnabled: false,
        }
        return fn(data)
      }),
      formState: mockFormState,
      watch: mockWatch,
      setValue: jest.fn(),
      trigger: jest.fn(() => Promise.resolve(false)),
    })
  
    require('@/lib/validation').createQuestionSchema.safeParse.mockReturnValue({
      success: false,
      error: { issues: [{ message: 'Expected answer must match an option key' }] },
    })
  
    render(<MultiChoiceQuestionForm {...invalidData} />)
  
    expect(screen.getByText(/expected answer must match an option key/i)).toBeInTheDocument()
  })
})
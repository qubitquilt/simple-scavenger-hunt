import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ImageQuestionForm from '@/components/admin/ImageQuestionForm'

const mockOnSubmit = jest.fn()
const user = userEvent.setup()

describe('ImageQuestionForm', () => {
  const defaultProps = {
    initialData: undefined,
    onSubmit: mockOnSubmit,
    eventId: 'test-event'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders form inputs with defaults', () => {
    render(<ImageQuestionForm {...defaultProps} />)

    expect(screen.getByLabelText(/question content/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/image description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/expected answer/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ai threshold/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/enable hints/i)).toBeInTheDocument()

    // Checkboxes default checked
    expect(screen.getByLabelText(/jpg/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/png/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/gif/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/jpg/i)).toBeChecked()
    expect(screen.getByLabelText(/png/i)).toBeChecked()
    expect(screen.getByLabelText(/gif/i)).toBeChecked()

    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('submits valid form data', async () => {
    render(<ImageQuestionForm {...defaultProps} />)

    await user.type(screen.getByLabelText(/question content/i), 'Test content')
    await user.type(screen.getByLabelText(/image description/i), 'Upload image of a cat')
    await user.type(screen.getByLabelText(/expected answer/i), 'A cat')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        type: 'image',
        content: 'Test content',
        imageDescription: 'Upload image of a cat',
        expectedAnswer: 'A cat',
        allowedFormats: ['jpg', 'png', 'gif'],
        aiThreshold: 8,
        hintEnabled: false
      }), expect.anything())
    })
  })

  it('shows validation error for missing image description', async () => {
    render(<ImageQuestionForm {...defaultProps} />)

    await user.type(screen.getByLabelText(/question content/i), 'Content')
    await user.type(screen.getByLabelText(/expected answer/i), 'Answer')

    // Uncheck all formats to also test that
    const jpgCheckbox = screen.getByLabelText(/jpg/i)
    await user.click(jpgCheckbox)
    await user.click(screen.getByLabelText(/png/i))
    await user.click(screen.getByLabelText(/gif/i))

    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(screen.getByText(/image description is required/i)).toBeInTheDocument()
      expect(screen.getByText(/at least one format required/i)).toBeInTheDocument()
    })
  })

  it('toggles allowed formats checkboxes', async () => {
    render(<ImageQuestionForm {...defaultProps} />)

    // Initial all checked
    expect(screen.getByLabelText(/jpg/i)).toBeChecked()

    // Toggle jpg off
    await user.click(screen.getByLabelText(/jpg/i))
    expect(screen.getByLabelText(/jpg/i)).not.toBeChecked()

    // Toggle back on
    await user.click(screen.getByLabelText(/jpg/i))
    expect(screen.getByLabelText(/jpg/i)).toBeChecked()

    // Submit with some unchecked, but since default others checked, and we set imageDescription
    await user.type(screen.getByLabelText(/image description/i), 'Desc')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        imageDescription: 'Desc',
        allowedFormats: expect.arrayContaining(['png', 'gif']) // jpg toggled but back on
      }), expect.anything())
    })
  })

  it('handles cancel with unsaved changes confirmation', async () => {
    const mockOnCancel = jest.fn()
    const mockConfirm = jest.fn(() => false)
    global.confirm = mockConfirm

    render(<ImageQuestionForm {...defaultProps} onCancel={mockOnCancel} />)

    // Make dirty by typing
    await user.type(screen.getByLabelText(/image description/i), 'Dirty')

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockConfirm).toHaveBeenCalledWith('Unsaved changes will be lost. Discard?')
    expect(mockOnCancel).not.toHaveBeenCalled()

    mockConfirm.mockReturnValueOnce(true)
    await user.click(cancelButton)
    expect(mockOnCancel).toHaveBeenCalled()
  })
})
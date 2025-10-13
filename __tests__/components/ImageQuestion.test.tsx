import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ImageQuestionComponent from '@/components/ImageQuestion'
import type { Question } from '@/types/question'

// Mock fetch
global.fetch = jest.fn()

// Mock MediaDevices
const mockGetUserMedia = jest.fn()
Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
  writable: true,
  value: mockGetUserMedia,
})

// Mock canvas toBlob
HTMLCanvasElement.prototype.toBlob = jest.fn()

// Mock File API for drag-drop
const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })

const mockUser = userEvent.setup()
const mockOnSubmit = jest.fn()
const mockQuestion: Question = {
  id: 'q1',
  eventId: 'test-event',
  type: 'image',
  content: 'Test content',
  expectedAnswer: '',
  aiThreshold: 8,
  hintEnabled: false,
  createdAt: '2023-01-01T00:00:00.000Z',
  imageDescription: 'Describe the image',
  allowedFormats: ['jpeg', 'png'],
  maxFileSize: 5 * 1024 * 1024,
  minResolution: { width: 100, height: 100 },
} as Question

const defaultProps = {
  question: mockQuestion,
  onSubmit: mockOnSubmit,
}

describe('ImageQuestion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://example.com/image.jpg' }),
    })
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    })
    ;(HTMLCanvasElement.prototype.toBlob as jest.Mock).mockImplementation((callback) => {
      callback(mockFile)
    })
  })

  it('renders prompt and drop zone', () => {
    render(<ImageQuestionComponent {...defaultProps} />)

    expect(screen.getByText('Describe the image')).toBeInTheDocument()
    expect(screen.getByText(/drag and drop an image here or click to browse/i)).toBeInTheDocument()
    expect(screen.getByText(/supports: jpeg, png, gif • max: 5mb/i)).toBeInTheDocument()
  })

  it('renders camera button', () => {
    render(<ImageQuestionComponent {...defaultProps} />)

    expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument()
  })

  it('handles drag and drop file select', async () => {
    render(<ImageQuestionComponent {...defaultProps} />)

    const dropZone = screen.getByRole('button', { name: /drag and drop image here or click to browse/i })
    const dataTransfer = { files: [mockFile] }

    fireEvent.dragOver(dropZone)
    fireEvent.drop(dropZone, { dataTransfer })

    await waitFor(() => {
      expect(screen.getByAltText('Preview of uploaded image')).toBeInTheDocument()
    })
  })

  it('handles camera capture', async () => {
    render(<ImageQuestionComponent {...defaultProps} />)

    const cameraButton = screen.getByRole('button', { name: /take photo/i })
    await mockUser.click(cameraButton)

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({ video: true })
    })

    // Simulate capture button in modal
    const captureButton = await screen.findByRole('button', { name: /capture/i })
    await mockUser.click(captureButton)

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalled()
      expect(mockOnSubmit).toHaveBeenCalledWith({ url: 'https://example.com/image.jpg', metadata: expect.any(Object) })
    })
  })

  it('validates valid file size and format', async () => {
    render(<ImageQuestionComponent {...defaultProps} />)

    const dropZone = screen.getByRole('button', { name: /drag and drop image here or click to browse/i })
    const validFile = new File(['content'], 'valid.png', { type: 'image/png' })
    const dataTransfer = { files: [validFile] }

    fireEvent.drop(dropZone, { dataTransfer })

    await waitFor(() => {
      expect(screen.getByAltText('Preview of uploaded image')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  it('shows validation error for invalid file format', async () => {
    render(<ImageQuestionComponent {...defaultProps} />)

    const dropZone = screen.getByRole('button', { name: /drag and drop image here or click to browse/i })
    const invalidFile = new File(['content'], 'invalid.txt', { type: 'text/plain' })
    const dataTransfer = { files: [invalidFile] }

    fireEvent.drop(dropZone, { dataTransfer })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid file type/i)
    })
  })

  it('shows validation error for file too large', async () => {
    render(<ImageQuestionComponent {...defaultProps} />)

    const dropZone = screen.getByRole('button', { name: /drag and drop image here or click to browse/i })
    const largeFile = new File(new Array(10 * 1024 * 1024).fill('a'), 'large.jpg', { type: 'image/jpeg' }) // 10MB
    const dataTransfer = { files: [largeFile] }

    fireEvent.drop(dropZone, { dataTransfer })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/file too large/i)
    })
  })

  it('uploads image on select success', async () => {
    render(<ImageQuestionComponent {...defaultProps} />)

    const dropZone = screen.getByRole('button', { name: /drag and drop image here or click to browse/i })
    const dataTransfer = { files: [mockFile] }

    fireEvent.drop(dropZone, { dataTransfer })

    const uploadButton = screen.getByRole('button', { name: /upload image/i })
    await mockUser.click(uploadButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/upload/image', expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }))
      expect(mockOnSubmit).toHaveBeenCalledWith({ url: 'https://example.com/image.jpg', metadata: expect.any(Object) })
    })
  })

  it('handles upload error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'))

    render(<ImageQuestionComponent {...defaultProps} />)

    const dropZone = screen.getByRole('button', { name: /drag and drop image here or click to browse/i })
    const dataTransfer = { files: [mockFile] }

    fireEvent.drop(dropZone, { dataTransfer })

    const uploadButton = screen.getByRole('button', { name: /upload image/i })
    await mockUser.click(uploadButton)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/upload failed/i)
    })
  })

  it('has proper accessibility labels and roles', () => {
    render(<ImageQuestionComponent {...defaultProps} />)

    const dropZone = screen.getByRole('button', { name: /drag and drop image here or click to browse/i })
    expect(dropZone).toHaveAttribute('tabindex', '0')
    expect(dropZone).toHaveAttribute('aria-label', 'Drag and drop image here or click to browse')

    const cameraButton = screen.getByRole('button', { name: /take photo/i })
    expect(cameraButton).toHaveAttribute('aria-label', 'Open camera to take photo')
  })
})
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ImageQuestion from '@/components/ImageQuestion'
import type { Question } from '@/types/question'

// Mock fetch
global.fetch = jest.fn()

// Mock navigator.mediaDevices for camera
const mockStream = {
  getTracks: () => [{ stop: jest.fn() }]
} as any

beforeAll(() => {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn(() => Promise.resolve(mockStream))
    },
    writable: true,
  })
})

beforeEach(() => {
  jest.clearAllMocks()
  ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(mockStream)
})

const mockUser = userEvent.setup()
const mockOnAnswer = jest.fn()
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
  allowedFormats: ['jpg', 'png'],
  maxFileSize: 5 * 1024 * 1024,
  minResolution: { width: 100, height: 100 },
} as Question

const defaultProps = {
  question: mockQuestion,
  progress: null,
  onAnswer: mockOnAnswer,
}

describe('ImageQuestion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://example.com/image.jpg' }),
    })
    jest.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue(mockStream)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders prompt and drop zone', () => {
    render(<ImageQuestion {...defaultProps} />)

    expect(screen.getByText('Describe the image')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /drag and drop image here or click to browse/i })).toBeInTheDocument()
  })

  it('renders camera button', () => {
    render(<ImageQuestion {...defaultProps} />)

    expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument()
  })

  it('handles file drop and shows preview', async () => {
    render(<ImageQuestion {...defaultProps} />)

    const dropZone = screen.getByRole('button', { name: /drag and drop image here or click to browse/i })
    const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    const dataTransfer = { files: [mockFile] }

    fireEvent.drop(dropZone, { dataTransfer })

    await waitFor(() => {
      expect(screen.getByAltText('Preview of uploaded image')).toBeInTheDocument()
    })
  })

  it('uploads image on button click', async () => {
    const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    const dataTransfer = { files: [mockFile] }

    render(<ImageQuestion {...defaultProps} />)

    const dropZone = screen.getByRole('button', { name: /drag and drop image here or click to browse/i })
    fireEvent.drop(dropZone, { dataTransfer })

    await waitFor(() => {
      expect(screen.getByAltText('Preview of uploaded image')).toBeInTheDocument()
    })

    const uploadButton = screen.getByText('Upload Image')
    await mockUser.click(uploadButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/upload/image', expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }))
      expect(mockOnAnswer).toHaveBeenCalledWith('https://example.com/image.jpg')
    })
  })

  it('handles upload error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'))

    const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    const dataTransfer = { files: [mockFile] }

    render(<ImageQuestion {...defaultProps} />)

    const dropZone = screen.getByRole('button', { name: /drag and drop image here or click to browse/i })
    fireEvent.drop(dropZone, { dataTransfer })

    await waitFor(() => {
      expect(screen.getByAltText('Preview of uploaded image')).toBeInTheDocument()
    })

    const uploadButton = screen.getByText('Upload Image')
    await mockUser.click(uploadButton)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/upload failed/i)
    })
  })

  it('shows camera modal on take photo click', async () => {
    render(<ImageQuestion {...defaultProps} />)

    const cameraButton = screen.getByRole('button', { name: /take photo/i })
    await mockUser.click(cameraButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /capture/i })).toBeInTheDocument()
    })
  })

  it('has proper accessibility', () => {
    render(<ImageQuestion {...defaultProps} />)

    const dropZone = screen.getByRole('button', { name: /drag and drop image here or click to browse/i })
    expect(dropZone).toHaveAttribute('tabindex', '0')

    const cameraButton = screen.getByRole('button', { name: /take photo/i })
    expect(cameraButton).toHaveAttribute('aria-label', 'Open camera to take photo')
  })
})
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ImageQuestionForm from '@/components/admin/ImageQuestionForm'
import ChallengesPage from '@/app/challenges/page'
import { getUserId } from '@/utils/session'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock utils
jest.mock('@/utils/session', () => ({
  getUserId: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

// Mock MediaDevices for camera
const mockGetUserMedia = jest.fn()
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
})

// Mock canvas toBlob
HTMLCanvasElement.prototype.toBlob = jest.fn()

const mockUser = userEvent.setup()

describe('Image Question User Flow E2E Simulation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getUserId as jest.Mock).mockReturnValue('test-user')
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    })
    ;(HTMLCanvasElement.prototype.toBlob as jest.Mock).mockImplementation((callback) => {
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      callback(mockFile)
    })
  })

  describe('Admin creates image question', () => {
    it('admin form submits image question successfully', async () => {
      const mockOnSubmit = jest.fn()
      render(<ImageQuestionForm initialData={undefined} onSubmit={mockOnSubmit} eventId="test-event" />)

      // Fill form
      await mockUser.type(screen.getByLabelText(/content/i), 'Upload an image of a cat')
      await mockUser.type(screen.getByLabelText(/image description/i), 'Describe the cat in the image')
      await mockUser.type(screen.getByLabelText(/expected answer/i), 'Cat description')
      fireEvent.click(screen.getByLabelText(/enable hints/i))

      // Select formats
      fireEvent.click(screen.getByLabelText(/jpeg/i))
      fireEvent.click(screen.getByLabelText(/png/i))

      // Set max size and resolution
      fireEvent.change(screen.getByLabelText(/max file size/i), { target: { value: '5242880' } })
      fireEvent.change(screen.getByLabelText(/width/i), { target: { value: '100' } })
      fireEvent.change(screen.getByLabelText(/height/i), { target: { value: '100' } })

      await mockUser.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
          type: 'image',
          imageDescription: 'Describe the cat in the image',
          allowedFormats: ['jpeg', 'png'],
          maxFileSize: 5242880,
          minResolution: { width: 100, height: 100 },
        }))
      })
    })
  })

  describe('User completes image challenge', () => {
    beforeEach(() => {
      const mockData = {
        progress: { completed: false },
        questions: [
          {
            id: 'q1',
            type: 'image',
            content: 'Upload an image',
            imageDescription: 'Describe the image',
            answered: false,
          },
        ],
        stats: { completedCount: 0, totalCount: 1 },
      }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })
    })

    it('user drags and uploads image to challenge', async () => {
      render(<ChallengesPage />)

      await waitFor(() => {
        expect(screen.getByText('Upload an image')).toBeInTheDocument()
      })

      // Click to challenge (assuming navigation)
      const challengeLink = screen.getByText('Upload an image')
      await mockUser.click(challengeLink)

      // Wait for ImageQuestion component
      await waitFor(() => {
        expect(screen.getByText('Describe the image')).toBeInTheDocument()
      })

      const dropZone = screen.getByRole('button', { name: /drag and drop image here or click to browse/i })
      const mockFile = new File(['image data'], 'test.jpg', { type: 'image/jpeg' })
      const dataTransfer = { files: [mockFile] }

      fireEvent.dragOver(dropZone)
      fireEvent.drop(dropZone, { dataTransfer })

      await waitFor(() => {
        expect(screen.getByAltText('Preview of uploaded image')).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /upload image/i })
      await mockUser.click(uploadButton)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/answers', expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        }))
      })

      // Assert progress update
      expect(mockPush).not.toHaveBeenCalledWith('/complete') // Not completed yet
    })

    it('user uses camera to capture and submit', async () => {
      render(<ChallengesPage />)

      await waitFor(() => {
        expect(screen.getByText('Upload an image')).toBeInTheDocument()
      })

      const challengeLink = screen.getByText('Upload an image')
      await mockUser.click(challengeLink)

      await waitFor(() => {
        expect(screen.getByText('Describe the image')).toBeInTheDocument()
      })

      const cameraButton = screen.getByRole('button', { name: /take photo/i })
      await mockUser.click(cameraButton)

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({ video: true })
      })

      // Simulate capture in modal
      const captureButton = screen.getByRole('button', { name: /capture/i })
      await mockUser.click(captureButton)

      await waitFor(() => {
        expect(screen.getByAltText('Preview of uploaded image')).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /upload image/i })
      await mockUser.click(uploadButton)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/answers', expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        }))
      })
    })

    it('shows error on upload failure and allows retry', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'))

      render(<ChallengesPage />)

      await waitFor(() => {
        expect(screen.getByText('Upload an image')).toBeInTheDocument()
      })

      const challengeLink = screen.getByText('Upload an image')
      await mockUser.click(challengeLink)

      await waitFor(() => {
        expect(screen.getByText('Describe the image')).toBeInTheDocument()
      })

      const dropZone = screen.getByRole('button', { name: /drag and drop image here or click to browse/i })
      const mockFile = new File(['image data'], 'test.jpg', { type: 'image/jpeg' })
      const dataTransfer = { files: [mockFile] }

      fireEvent.drop(dropZone, { dataTransfer })

      await waitFor(() => {
        expect(screen.getByAltText('Preview of uploaded image')).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /upload image/i })
      await mockUser.click(uploadButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/upload failed/i)
      })

      // Retry should be possible - button still there
      expect(screen.getByRole('button', { name: /upload image/i })).toBeInTheDocument()
    })
  })
})
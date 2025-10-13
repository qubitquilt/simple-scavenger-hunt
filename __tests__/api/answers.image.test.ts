import { NextRequest } from 'next/server'
import { POST } from '@/app/api/answers/route'
import { prisma } from '@/lib/prisma'
import storage from '@/lib/storage'

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    answer: {
      create: jest.fn(),
    },
    progress: {
      upsert: jest.fn(),
    },
    question: {
      findUnique: jest.fn(),
    },
  },
}))

// Mock storage
jest.mock('@/lib/storage', () => ({
  default: {
    uploadImage: jest.fn(),
  },
}))

// Mock AI call - assuming there's an AI service
const mockAICall = jest.fn()
jest.mock('../lib/ai', () => ({
  analyzeImage: mockAICall,
}))

// Mock session/auth
const mockGetUserId = jest.fn()
jest.mock('@/utils/session', () => ({
  getUserId: mockGetUserId,
}))

const mockPrisma = require('@/lib/prisma').prisma
const mockStorage = storage

describe('POST /api/answers for image submission', () => {
  const mockReq = (body: FormData) => ({
    json: async () => ({}),
    formData: async () => body,
    headers: new Headers(),
  } as unknown as NextRequest)

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUserId.mockReturnValue('user1')
    mockPrisma.question.findUnique.mockResolvedValue({
      id: 'q1',
      type: 'image',
      eventId: 'ev1',
      content: 'Test',
    })
    mockStorage.uploadImage.mockResolvedValue({ url: '/uploads/image.jpg' })
    mockPrisma.answer.create.mockResolvedValue({ id: 'a1' })
    mockPrisma.progress.upsert.mockResolvedValue({ completedCount: 1 })
    mockAICall.mockResolvedValue({ analysis: 'Test analysis' })
  })

  it('submits image answer successfully', async () => {
    const formData = new FormData()
    formData.append('file', new File(['image data'], 'test.jpg', { type: 'image/jpeg' }))
    formData.append('questionId', 'q1')
    formData.append('answer', 'User description')

    const req = mockReq(formData)
    req.headers.set('content-type', 'multipart/form-data')

    const res = await POST(req)

    expect(mockStorage.uploadImage).toHaveBeenCalled()
    expect(mockAICall).toHaveBeenCalledWith('/uploads/image.jpg', 'User description', expect.any(Object))
    expect(mockPrisma.answer.create).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        userId: 'user1',
        questionId: 'q1',
        answer: 'User description',
        imageUrl: '/uploads/image.jpg',
        aiAnalysis: 'Test analysis',
      },
    }))
    expect(mockPrisma.progress.upsert).toHaveBeenCalled()
    expect(res).toEqual({ success: true, answer: { id: 'a1' } })
  })

  it('returns 400 for missing file', async () => {
    const formData = new FormData()
    formData.append('questionId', 'q1')
    formData.append('answer', 'Description')

    const req = mockReq(formData)
    req.headers.set('content-type', 'multipart/form-data')

    const res = await POST(req)

    expect(res).toEqual({ error: 'File is required for image questions' })
    expect(mockStorage.uploadImage).not.toHaveBeenCalled()
  })

  it('returns 404 if question not found', async () => {
    const formData = new FormData()
    formData.append('file', new File(['image data'], 'test.jpg', { type: 'image/jpeg' }))
    formData.append('questionId', 'q1')
    formData.append('answer', 'Description')

    mockPrisma.question.findUnique.mockResolvedValue(null)

    const req = mockReq(formData)
    req.headers.set('content-type', 'multipart/form-data')

    const res = await POST(req)

    expect(res).toEqual({ error: 'Question not found' })
  })

  it('returns 500 if upload fails', async () => {
    const formData = new FormData()
    formData.append('file', new File(['image data'], 'test.jpg', { type: 'image/jpeg' }))
    formData.append('questionId', 'q1')
    formData.append('answer', 'Description')

    mockStorage.uploadImage.mockRejectedValue(new Error('Upload failed'))

    const req = mockReq(formData)
    req.headers.set('content-type', 'multipart/form-data')

    const res = await POST(req)

    expect(res).toEqual({ error: 'Upload failed' })
  })

  it('returns 500 if AI analysis fails', async () => {
    const formData = new FormData()
    formData.append('file', new File(['image data'], 'test.jpg', { type: 'image/jpeg' }))
    formData.append('questionId', 'q1')
    formData.append('answer', 'Description')

    mockAICall.mockRejectedValue(new Error('AI error'))

    const req = mockReq(formData)
    req.headers.set('content-type', 'multipart/form-data')

    const res = await POST(req)

    expect(res).toEqual({ error: 'AI analysis failed' })
  })

  it('returns 401 if no user session', async () => {
    mockGetUserId.mockReturnValue(null)

    const formData = new FormData()
    formData.append('file', new File(['image data'], 'test.jpg', { type: 'image/jpeg' }))
    formData.append('questionId', 'q1')
    formData.append('answer', 'Description')

    const req = mockReq(formData)
    req.headers.set('content-type', 'multipart/form-data')

    const res = await POST(req)

    expect(res).toEqual({ error: 'Unauthorized' })
  })
})
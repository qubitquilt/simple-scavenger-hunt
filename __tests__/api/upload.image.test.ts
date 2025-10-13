import { NextRequest } from 'next/server'
import { POST } from '@/app/api/upload/image/route'
import { imageUploadSchema } from '@/lib/validation'
import { getServerSession } from 'next-auth'
import * as prismaModule from '@/lib/prisma'
import * as fsModule from 'fs/promises'
import * as pathModule from 'path'

// Mock validation
jest.mock('@/lib/validation', () => ({
  ...jest.requireActual('@/lib/validation'),
  imageUploadSchema: {
    safeParse: jest.fn(),
  },
}))

// Mock auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// Mock prisma
const prismaMocks = {
  progress: {
    findFirst: jest.fn(),
  },
  question: {
    findFirst: jest.fn(),
  },
  event: {
    findUnique: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: prismaMocks,
}))

// Mock fs
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
}))

// Mock path
jest.mock('path', () => ({
  join: jest.fn(),
}))

const mockImageUpload = imageUploadSchema.safeParse as jest.Mock
const mockGetServerSession = getServerSession as jest.Mock
const mockPrismaProgressFindFirst = prismaMocks.progress.findFirst as jest.Mock
const mockPrismaQuestionFindFirst = prismaMocks.question.findFirst as jest.Mock
const mockPrismaEventFindUnique = prismaMocks.event.findUnique as jest.Mock
const mockFsMkdir = fsModule.mkdir as jest.Mock
const mockFsWriteFile = fsModule.writeFile as jest.Mock
const mockFsUnlink = fsModule.unlink as jest.Mock
const mockPathJoin = pathModule.join as jest.Mock

describe('POST /api/upload/image', () => {
  const mockReq = (formData: FormData) => ({
    formData: async () => formData,
    cookies: {
      get: jest.fn(() => ({ value: 'user1' })),
    },
  } as unknown as NextRequest)

  beforeEach(() => {
    jest.clearAllMocks()
    mockImageUpload.mockReturnValue({ success: true, data: {} })
    mockGetServerSession.mockResolvedValue({ user: { id: 'user1' } })
    mockPrismaProgressFindFirst.mockResolvedValue({ id: 'p1', eventId: 'ev1' })
    mockPrismaQuestionFindFirst.mockResolvedValue({ 
      id: 'q1', 
      type: 'image', 
      allowedFormats: JSON.stringify(['jpg', 'png']), 
      maxFileSize: 5 * 1024 * 1024 
    })
    mockPrismaEventFindUnique.mockResolvedValue({ slug: 'event-slug' })
    mockFsMkdir.mockResolvedValue(undefined as any)
    mockFsWriteFile.mockResolvedValue(undefined as any)
    mockPathJoin.mockImplementation((...args: string[]) => args.join('/'))
  })

  it('returns 201 with upload URL for valid FormData', async () => {
    const formData = new FormData()
    formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))
    formData.append('questionId', 'q1')

    const req = mockReq(formData)
    const res = await POST(req)

    expect(mockImageUpload).toHaveBeenCalled()
    expect(mockPrismaQuestionFindFirst).toHaveBeenCalledWith({
      where: { id: 'q1', eventId: 'ev1' },
      select: { type: true, allowedFormats: true, maxFileSize: true }
    })
    expect(mockFsMkdir).toHaveBeenCalledWith(expect.stringContaining('public/uploads/event-slug/q1'), { recursive: true })
    expect(mockFsWriteFile).toHaveBeenCalled()
    expect(res).toEqual({ url: expect.stringContaining('/uploads/event-slug/q1/') })
  })

  it('returns 400 for invalid FormData schema', async () => {
    const formData = new FormData()
    formData.append('invalid', 'data')

    mockImageUpload.mockReturnValue({ success: false, error: { issues: [{ message: 'Invalid' }] } })

    const req = mockReq(formData)
    const res = await POST(req)

    expect(res).toEqual({ error: 'Invalid input' })
    expect(mockFsWriteFile).not.toHaveBeenCalled()
  })

  it('returns 404 if question not found', async () => {
    const formData = new FormData()
    formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))
    formData.append('questionId', 'q1')

    mockPrismaQuestionFindFirst.mockResolvedValue(null)

    const req = mockReq(formData)
    const res = await POST(req)

    expect(res).toEqual({ error: 'Image question not found' })
    expect(mockFsWriteFile).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid file format', async () => {
    const formData = new FormData()
    formData.append('file', new File(['test'], 'test.txt', { type: 'text/plain' }))
    formData.append('questionId', 'q1')

    const req = mockReq(formData)
    const res = await POST(req)

    expect(res).toEqual({ error: 'Invalid file format. Allowed: jpg,png' })
    expect(mockFsWriteFile).not.toHaveBeenCalled()
  })

  it('returns 400 for file too large', async () => {
    const formData = new FormData()
    const largeFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    Object.defineProperty(largeFile, 'size', { value: 10 * 1024 * 1024 })
    formData.append('file', largeFile)
    formData.append('questionId', 'q1')

    const req = mockReq(formData)
    const res = await POST(req)

    expect(res).toEqual({ error: 'File too large' })
    expect(mockFsWriteFile).not.toHaveBeenCalled()
  })

  it('returns 500 if write file fails', async () => {
    const formData = new FormData()
    formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))
    formData.append('questionId', 'q1')

    mockFsWriteFile.mockRejectedValue(new Error('Write error'))

    const req = mockReq(formData)
    const res = await POST(req)

    expect(res).toEqual({ error: 'Internal server error' })
  })
})
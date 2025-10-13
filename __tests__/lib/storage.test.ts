import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import storage, { StorageService } from '@/lib/storage'

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
}))

// Mock path
jest.mock('path', () => ({
  join: jest.fn(),
  dirname: jest.fn(),
}))

// Mock crypto
jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}))

const mockMkdir = fs.mkdir as jest.Mock
const mockWriteFile = fs.writeFile as jest.Mock
const mockUnlink = fs.unlink as jest.Mock
const mockPathJoin = path.join as jest.Mock
const mockPathDirname = path.dirname as jest.Mock
const mockRandomUUID = randomUUID as jest.Mock

describe('storage', () => {
  let testStorage: StorageService

  beforeEach(() => {
    jest.clearAllMocks()
    mockRandomUUID.mockReturnValue('test-uuid')
    mockPathJoin.mockImplementation((...args: string[]) => args.join('/'))
    mockPathDirname.mockImplementation((p: string) => {
      const parts = p.split('/')
      parts.pop()
      return parts.join('/')
    })
    testStorage = storage
  })

  describe('uploadImage', () => {
    it('creates directory and writes file with UUID filename', async () => {
      const fileBuffer = Buffer.from('test image data')
      const ext = 'jpg'
      const questionId = 'q1'
      const eventSlug = 'test-event'

      mockMkdir.mockResolvedValue(undefined)
      mockWriteFile.mockResolvedValue(undefined)

      const result = await testStorage.uploadImage(fileBuffer, ext, questionId, eventSlug)

      expect(mockPathJoin).toHaveBeenCalledWith('public', 'uploads', 'test-event', 'q1', 'test-uuid.jpg')
      expect(mockPathDirname).toHaveBeenCalledWith('public/uploads/test-event/q1/test-uuid.jpg')
      expect(mockMkdir).toHaveBeenCalledWith('public/uploads/test-event/q1', { recursive: true })
      expect(mockRandomUUID).toHaveBeenCalled()
      expect(mockWriteFile).toHaveBeenCalledWith('public/uploads/test-event/q1/test-uuid.jpg', fileBuffer)
      expect(result).toEqual({ url: '/uploads/test-event/q1/test-uuid.jpg' })
    })

    it('handles directory creation errors', async () => {
      const fileBuffer = Buffer.from('test image data')
      const ext = 'jpg'
      const questionId = 'q1'
      const eventSlug = 'test-event'

      mockMkdir.mockRejectedValue(new Error('Permission denied'))

      await expect(testStorage.uploadImage(fileBuffer, ext, questionId, eventSlug)).rejects.toThrow('Permission denied')
    })
  })

  describe('cleanupImage', () => {
    it('unlinks the file from public directory', async () => {
      const url = '/uploads/test-event/q1/test-uuid.jpg'

      mockUnlink.mockResolvedValue(undefined)
  
      await testStorage.cleanupImage(url)
  
      expect(mockPathJoin).toHaveBeenCalledWith('public', 'uploads/test-event/q1/test-uuid.jpg')
      expect(mockUnlink).toHaveBeenCalledWith('public/uploads/test-event/q1/test-uuid.jpg')
    })

    it('logs error but continues if unlink fails', async () => {
      const url = '/uploads/test-event/q1/test-uuid.jpg'
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()

      mockUnlink.mockRejectedValue(new Error('File not found'))

      await testStorage.cleanupImage(url)

      expect(mockConsoleError).toHaveBeenCalledWith('Failed to cleanup image:', expect.any(Error))
      mockConsoleError.mockRestore()
    })

    it('does nothing if url does not start with /uploads/', async () => {
      const url = '/other/path.jpg'
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()

      await testStorage.cleanupImage(url)

      expect(mockUnlink).not.toHaveBeenCalled()
      expect(mockConsoleError).not.toHaveBeenCalled()
      mockConsoleError.mockRestore()
    })
  })
})
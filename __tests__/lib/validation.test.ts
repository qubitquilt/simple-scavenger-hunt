import { z } from 'zod'
import {
  imageQuestionSchema,
  createQuestionSchema,
  bufferValidationSchema,
  type ImageQuestionData,
  type CreateQuestion,
} from '@/lib/validation'

// Mock zod for testing, but actually test the schemas directly

describe('Image Validation Schemas', () => {
  describe('imageQuestionSchema', () => {
    const validImageData: ImageQuestionData = {
      type: 'image',
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      content: 'Test content',
      expectedAnswer: 'Expected',
      aiThreshold: 8,
      hintEnabled: false,
      imageDescription: 'Describe the image',
      allowedFormats: ['jpg', 'png'],
      maxFileSize: 5 * 1024 * 1024,
      minResolution: { width: 100, height: 100 },
      required: false,
    }

    it('validates valid image question data', () => {
      const result = imageQuestionSchema.safeParse(validImageData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validImageData)
    })

    it('requires imageDescription', () => {
      const invalidData = { ...validImageData, imageDescription: '' }
      const result = imageQuestionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error!.issues[0].message).toBe('Image description is required')
    })

    it('validates minResolution width and height minimums', () => {
      const invalidData = { ...validImageData, minResolution: { width: 0, height: 100 } }
      const result = imageQuestionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error!.issues[0].message).toBe('Width must be at least 1')
    })

    it('requires at least one allowed format', () => {
      const invalidData = { ...validImageData, allowedFormats: [] }
      const result = imageQuestionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error!.issues[0].message).toBe('At least one format required')
    })

    it('validates allowedFormats enum', () => {
      const invalidData = { ...validImageData, allowedFormats: ['invalid', 'png'] }
      const result = imageQuestionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error!.issues[0].message).toBe('Invalid input')
    })

    it('validates maxFileSize range', () => {
      const invalidData = { ...validImageData, maxFileSize: 15 * 1024 * 1024 } // >10MB
      const result = imageQuestionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error!.issues[0].message).toBe('Number must be less than or equal to 10485760')
    })

    it('uses defaults correctly', () => {
      const minimalData = {
        type: 'image',
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Test',
        expectedAnswer: 'Expected',
        imageDescription: 'Describe',
        allowedFormats: ['jpg'],
      }
      const result = imageQuestionSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
      expect(result.data!.aiThreshold).toBe(8)
      expect(result.data!.hintEnabled).toBe(false)
      expect(result.data!.maxFileSize).toBe(5 * 1024 * 1024)
      expect(result.data!.minResolution).toEqual({ width: 100, height: 100 })
      expect(result.data!.required).toBe(false)
    })
  })

  describe('createQuestionSchema for image type', () => {
    const validImageCreate: CreateQuestion = {
      type: 'image',
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      content: 'Test content',
      expectedAnswer: 'Expected',
      aiThreshold: 8,
      hintEnabled: false,
      imageDescription: 'Describe the image',
      allowedFormats: ['jpg', 'png'],
      maxFileSize: 5 * 1024 * 1024,
      minResolution: { width: 100, height: 100 },
      required: false,
    }

    it('validates valid image creation data', () => {
      const result = createQuestionSchema.safeParse(validImageCreate)
      expect(result.success).toBe(true)
    })

    it('fails validation for missing imageDescription in image type', () => {
      const invalidData = { ...validImageCreate, imageDescription: '' }
      const result = createQuestionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error!.issues.some((e: any) => e.message === 'Image description is required')).toBe(true)
    })

    it('validates discriminated union correctly for image', () => {
      const result = createQuestionSchema.safeParse(validImageCreate)
      expect(result.success).toBe(true)
      expect(result.data!.type).toBe('image')
    })
  })

  describe('bufferValidationSchema', () => {
    const validBufferData = {
      buffer: Buffer.from('test'),
      mimeType: 'image/jpeg',
      size: 1024,
      allowedFormats: ['image/jpeg', 'image/png'],
      maxFileSize: 5 * 1024 * 1024,
    }

    it('validates valid buffer data', () => {
      const result = bufferValidationSchema.safeParse(validBufferData)
      expect(result.success).toBe(true)
    })

    it('fails for invalid mimeType not in allowedFormats', () => {
      const invalidData = { ...validBufferData, mimeType: 'image/gif' }
      const result = bufferValidationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error!.issues[0].message).toBe('Invalid file format')
    })

    it('fails for size exceeding maxFileSize', () => {
      const invalidData = { ...validBufferData, size: 10 * 1024 * 1024 }
      const result = bufferValidationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error!.issues[0].message).toBe('File too large')
    })

    it('passes when size equals maxFileSize', () => {
      const boundaryData = { ...validBufferData, size: validBufferData.maxFileSize }
      const result = bufferValidationSchema.safeParse(boundaryData)
      expect(result.success).toBe(true)
    })
  })
})
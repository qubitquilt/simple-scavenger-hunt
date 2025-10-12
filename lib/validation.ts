import { z } from 'zod'

export const createQuestionSchema = z.object({
  eventId: z.string().uuid(),
  type: z.enum(['text', 'multiple_choice', 'image']),
  content: z.string().min(1),
  expectedAnswer: z.string().min(1),
  aiThreshold: z.number().min(0).max(10).default(8),
  hintEnabled: z.boolean().default(false),
  options: z.record(z.enum(['A', 'B', 'C', 'D']), z.string().min(1)).optional()
}).superRefine((data, ctx) => {
  if (data.type === 'multiple_choice') {
    if (!data.options || Object.keys(data.options).length < 2) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least 2 options required for multiple choice'
      })
    }
    if (!Object.keys(data.options || {}).includes(data.expectedAnswer)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Expected answer must be a valid option key'
      })
    }
  }
})

export const updateQuestionSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  type: z.enum(['text', 'multiple_choice', 'image']).optional(),
  content: z.string().min(1).optional(),
  expectedAnswer: z.string().min(1).optional(),
  aiThreshold: z.number().min(0).max(10).default(8).optional(),
  hintEnabled: z.boolean().default(false).optional(),
  options: z.record(z.enum(['A', 'B', 'C', 'D']), z.string().min(1)).optional()
}).superRefine((data, ctx) => {
  if (data.type === 'multiple_choice') {
    if (!data.options || Object.keys(data.options).length < 2) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least 2 options required for multiple choice'
      })
    }
    if (data.expectedAnswer && !Object.keys(data.options || {}).includes(data.expectedAnswer)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Expected answer must be a valid option key'
      })
    }
  }
})

export type CreateQuestion = z.infer<typeof createQuestionSchema>
export type UpdateQuestion = z.infer<typeof updateQuestionSchema>
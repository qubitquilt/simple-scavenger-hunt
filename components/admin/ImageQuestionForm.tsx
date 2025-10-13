'use client'

import React from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createQuestionSchema, CreateQuestion } from '@/lib/validation'
import type { Question } from '@/types/question'

interface ImageQuestionFormProps {
  initialData?: Partial<Question>
  onSubmit: (data: CreateQuestion) => Promise<void>
  onCancel?: () => void
  eventId: string
}

export default function ImageQuestionForm({
  initialData,
  onSubmit,
  onCancel,
  eventId
}: ImageQuestionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<CreateQuestion>({
    resolver: zodResolver(createQuestionSchema) as Resolver<CreateQuestion>,
    defaultValues: {
      eventId,
      type: 'image',
      content: initialData?.content ?? '',
      expectedAnswer: initialData?.expectedAnswer ?? '',
      aiThreshold: initialData?.aiThreshold ?? 8,
      hintEnabled: initialData?.hintEnabled ?? false,
      imageDescription: initialData?.imageDescription ?? '',
      allowedFormats: initialData?.allowedFormats ?? ['jpg', 'png', 'gif'],
    }
  })

  const handleCancel = () => {
    if (isDirty && !confirm('Unsaved changes will be lost. Discard?')) {
      return
    }
    onCancel?.()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="content"
          className="block text-sm font-medium text-gray-700"
        >
          Question Content
        </label>
        <textarea
          id="content"
          {...register('content')}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          aria-invalid={!!errors.content}
          aria-describedby={errors.content ? 'content-error' : undefined}
          aria-required="true"
        />
        {errors.content && (
          <p id="content-error" className="mt-1 text-sm text-red-500">
            {errors.content.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="imageDescription"
          className="block text-sm font-medium text-gray-700"
        >
          Image Description
        </label>
        <textarea
          id="imageDescription"
          {...register('imageDescription')}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          aria-invalid={!!(errors as any).imageDescription}
          aria-describedby={(errors as any).imageDescription ? 'imageDescription-error' : undefined}
          aria-required="true"
        />
        {(errors as any).imageDescription && (
          <p id="imageDescription-error" className="mt-1 text-sm text-red-500">
            {(errors as any).imageDescription.message}
          </p>
        )}
      </div>


      <fieldset role="group" aria-labelledby="allowedFormats-legend">
        <legend id="allowedFormats-legend" className="block text-sm font-medium text-gray-700 mb-2">
          Allowed Formats
        </legend>
        <div className="space-y-2">
          {(['jpg', 'png', 'gif'] as const).map((format) => (
            <label key={format} className="flex items-center">
              <input
                id={`allowedFormats-${format}`}
                type="checkbox"
                value={format}
                {...register('allowedFormats')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
              />
              <span className="text-sm text-gray-700">{format.toUpperCase()}</span>
            </label>
          ))}
        </div>
        {(errors as any).allowedFormats && (
          <p className="mt-1 text-sm text-red-500" role="alert">
            {(errors as any).allowedFormats.message}
          </p>
        )}
      </fieldset>



      <div>
        <label
          htmlFor="expectedAnswer"
          className="block text-sm font-medium text-gray-700"
        >
          Expected Answer
        </label>
        <input
          id="expectedAnswer"
          type="text"
          {...register('expectedAnswer')}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          aria-invalid={!!errors.expectedAnswer}
          aria-describedby={errors.expectedAnswer ? 'expectedAnswer-error' : undefined}
          aria-required="true"
        />
        {errors.expectedAnswer && (
          <p id="expectedAnswer-error" className="mt-1 text-sm text-red-500">
            {errors.expectedAnswer.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="aiThreshold"
          className="block text-sm font-medium text-gray-700"
        >
          AI Threshold (0-10)
        </label>
        <input
          id="aiThreshold"
          type="number"
          min={0}
          max={10}
          step={1}
          {...register('aiThreshold', { valueAsNumber: true })}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          aria-invalid={!!errors.aiThreshold}
          aria-describedby={errors.aiThreshold ? 'aiThreshold-error' : undefined}
        />
        {errors.aiThreshold && (
          <p id="aiThreshold-error" className="mt-1 text-sm text-red-500">
            {errors.aiThreshold.message}
          </p>
        )}
      </div>

      <div className="flex items-center">
        <input
          id="hintEnabled"
          type="checkbox"
          {...register('hintEnabled')}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          aria-describedby="hintEnabled-description"
        />
        <label htmlFor="hintEnabled" className="ml-2 block text-sm text-gray-900">
          Enable Hints
        </label>
        <span id="hintEnabled-description" className="sr-only">
          Allow users to request hints for this question
        </span>
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Submit
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        )}
      </div>

      {errors.root && (
        <p className="mt-1 text-sm text-red-500" role="alert" aria-live="polite">
          {errors.root.message}
        </p>
      )}
    </form>
  )
}
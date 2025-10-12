'use client'

import React from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createQuestionSchema, CreateQuestion } from '@/lib/validation'
import type { Question } from '@/types/question'

type OptionKey = 'A' | 'B' | 'C' | 'D'

interface MultiChoiceQuestionFormProps {
  initialData?: Partial<Question>
  onSubmit: (data: CreateQuestion) => Promise<void>
  onCancel?: () => void
  eventId: string
}

export default function MultiChoiceQuestionForm({
  initialData,
  onSubmit,
  onCancel,
  eventId
}: MultiChoiceQuestionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch
  } = useForm<CreateQuestion>({
    resolver: zodResolver(createQuestionSchema) as Resolver<CreateQuestion>,
    defaultValues: {
      eventId,
      type: 'multiple_choice',
      content: initialData?.content ?? '',
      expectedAnswer: initialData?.expectedAnswer ?? '',
      options: initialData?.options || { A: '', B: '', C: '', D: '' },
      aiThreshold: initialData?.aiThreshold ?? 8,
      hintEnabled: initialData?.hintEnabled ?? false
    }
  })

  const options = watch('options') as Record<OptionKey, string> || {}
  const optionKeys = Object.keys(options).filter((key): key is OptionKey => 
    (options[key as OptionKey] || '').trim().length > 0
  )

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

      <fieldset role="group" aria-labelledby="options-legend">
        <legend id="options-legend" className="block text-sm font-medium text-gray-700 mb-2">
          Options
        </legend>
        {(['A', 'B', 'C', 'D'] as const).map((key) => (
          <div key={key} className="flex items-center space-x-2">
            <label
              htmlFor={`options-${key}`}
              className="text-sm font-medium text-gray-700 w-8"
            >
              {key}
            </label>
            <input
              id={`options-${key}`}
              type="text"
              {...register(`options.${key}` as const)}
              className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              aria-invalid={!!errors.options?.[key]}
              aria-describedby={errors.options?.[key] ? `options-${key}-error` : undefined}
            />
            {errors.options?.[key] && (
              <p id={`options-${key}-error`} className="text-sm text-red-500">
                {errors.options[key]?.message}
              </p>
            )}
          </div>
        ))}
        {errors.root?.message && (
          <p className="mt-1 text-sm text-red-500" role="alert" aria-live="polite">
            {errors.root.message}
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
        <select
          id="expectedAnswer"
          {...register('expectedAnswer')}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          aria-invalid={!!errors.expectedAnswer}
          aria-describedby={errors.expectedAnswer ? 'expectedAnswer-error' : undefined}
          aria-required="true"
        >
          <option value="">Select an option</option>
          {optionKeys.map((key) => (
            <option key={key} value={key}>
              {key}: {options[key]}
            </option>
          ))}
        </select>
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
    </form>
  )
}
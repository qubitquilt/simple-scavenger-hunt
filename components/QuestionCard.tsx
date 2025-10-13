'use client'

import React from 'react'
import Link from 'next/link'
import type { Question } from '@/types/question'
import type { AnswerStatus } from '@/types/answer'

export interface QuestionWithStatus extends Question {
  slug: string
  userAnswer?: string | null
  computedStatus?: AnswerStatus | null
}

interface QuestionCardProps {
  question: QuestionWithStatus
  onSelect?: () => void
}

export default function QuestionCard({ question, onSelect }: QuestionCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect?.()
    }
  }

  const getStatusBadge = (status: AnswerStatus | null | undefined) => {
    if (!status) return null

    const badgeClasses = {
      accepted: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800'
    }

    const icons = {
      accepted: '✓',
      pending: '⏳',
      rejected: '✗'
    }

    const className = badgeClasses[status as keyof typeof badgeClasses]
    const icon = icons[status as keyof typeof icons]

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${className}`}>
        {icon} {status}
      </span>
    )
  }

  const previewText = question.content.length > 100
    ? `${question.content.substring(0, 100)}...`
    : question.content

  const cardContent = (
    <div className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{previewText}</h3>
      <p className="text-sm text-gray-600 mb-4">
        Type: {question.type.replace('_', ' ')}
      </p>
      {getStatusBadge(question.computedStatus)}
    </div>
  )

  if (onSelect) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label={`Select ${question.content}`}
      >
        {cardContent}
      </div>
    )
  }

  return (
    <Link
      href={`/challenges/${question.slug}`}
      className="block focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label={`View ${question.content}`}
    >
      {cardContent}
    </Link>
  )
}
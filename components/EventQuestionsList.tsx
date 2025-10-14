'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { Event } from '@/types/admin'
import type { QuestionWithStatus } from '@/components/QuestionCard'
import QuestionCard from '@/components/QuestionCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import RegistrationForm from '@/components/RegistrationForm'
import Link from 'next/link'
import { getUserId } from '@/utils/session'

interface ProgressResponse {
  questions: QuestionWithStatus[]
  progress: {
    completed: boolean
  }
  stats: {
    completedCount: number
    totalCount: number
  }
}

export default function EventQuestionsList({ event }: { event: Event, progressData?: ProgressResponse | null }) {
  const [progressData, setProgressData] = useState<ProgressResponse | null>(null)
  const [isLoadingProgress, setIsLoadingProgress] = useState(false)
  const router = useRouter()
  const { data: session, status } = useSession()

  const fetchProgress = async () => {
    try {
      setIsLoadingProgress(true)
      const data = await fetch(`/api/progress?eventId=${event.id}`)
      if (data.ok) {
        const result = await data.json()
        setProgressData(result)
      } else {
        setProgressData(null)
      }
    } catch (err) {
      console.error('Failed to fetch progress')
      setProgressData(null)
    } finally {
      setIsLoadingProgress(false)
    }
  }

  useEffect(() => {
    if (status !== 'authenticated') return

    fetchProgress()
  }, [event.id, status])

  if (status === 'loading' || isLoadingProgress) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!progressData) {
    return <RegistrationForm event={event} onSuccess={fetchProgress} />
  }

  const { questions, progress, stats } = progressData
  const progressPercentage = Math.round((stats.completedCount / stats.totalCount) * 100)
  const isCompleted = progress.completed || questions.every(q => q.computedStatus === 'accepted')

  const handleBack = () => {
    router.push('/')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleBack()
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{event.title}</h1>
        <button
          onClick={handleBack}
          onKeyDown={handleKeyDown}
          className="btn btn-ghost"
          aria-label="Back to home"
          tabIndex={0}
        >
          ← Back
        </button>
      </div>

      <div className="mb-6">
        <p className="text-gray-600 mb-2">
          <span className="font-semibold">Date:</span> {new Date(event.date).toLocaleDateString()}
        </p>
        {event.description && (
          <p className="text-gray-700">{event.description}</p>
        )}
      </div>

      <div className="alert alert-success mb-6">
        <h2 className="font-semibold">You're Registered!</h2>
        <p>
          Progress: {progressPercentage}% ({stats.completedCount}/{stats.totalCount} challenges completed)
        </p>
        {isCompleted && (
          <p className="font-semibold">🎉 Event completed!</p>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-medium text-gray-900">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No challenges available for this event.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
            />
          ))}
        </div>
      )}

      {isCompleted && (
        <div className="text-center">
          <Link
            href="/complete"
            className="btn btn-success"
          >
            View Completion
          </Link>
        </div>
      )}
    </div>
  )
}

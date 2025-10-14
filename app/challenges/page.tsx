'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUserId } from '@/utils/session'
import LoadingSpinner from '@/components/LoadingSpinner'

interface QuestionWithStatus {
  id: string
  slug: string
  type: string
  content: string
  answered?: boolean
  status?: 'pending' | 'correct' | 'incorrect'
}

interface ProgressResponse {
  progress: {
    completed: boolean
  }
  questions: QuestionWithStatus[]
  stats: {
    completedCount: number
    totalCount: number
  }
}

export default function ChallengesPage() {
  const [data, setData] = useState<ProgressResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const userId = getUserId()

  useEffect(() => {
    if (!userId) {
      router.push('/register')
      return
    }

    const fetchProgress = async () => {
      try {
        const response = await fetch('/api/progress')
        if (!response.ok) {
          throw new Error('Failed to fetch progress')
        }
        const result: ProgressResponse = await response.json()
        // Removed excessive logging - only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log('Fetched progress data:', result)
        }
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
  }, [userId, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <LoadingSpinner size="lg" />
        <div className="sr-only">Loading challenges...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-red-600 text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary mt-4"
            aria-label="Retry loading challenges"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-gray-600">No challenges available</div>
      </div>
    )
  }

  if (data?.progress?.completed) {
    router.push('/complete')
    return null
  }

  const { questions, stats } = data
  const progressPercentage = stats.totalCount > 0 ? (stats.completedCount / stats.totalCount) * 100 : 0

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Scavenger Hunt Challenges</h1>
        
        <div className="mb-8">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span>Progress</span>
            <span>{stats.completedCount} of {stats.totalCount}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Challenges progress"
            />
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((question) => (
            <Link
              key={question.id}
              href={`/challenges/${question.slug}`}
              className="block"
              aria-label={`Challenge: ${question.content.substring(0, 50)}... ${question.status ? `Status: ${question.status}` : 'Not started'}`}
            >
              <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <div className="card-body">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="card-title text-lg">{question.content}</h3>
                      <p className="text-sm opacity-70">
                        {question.answered ? `${question.status}` : ''}
                      </p>
                    </div>
                    <div className={`badge badge-lg ${
                      question.status === 'correct' ? 'badge-success' :
                      question.status === 'incorrect' ? 'badge-error' :
                      'badge-neutral'
                    }`}>
                      {question.status || 'Start'}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {stats.totalCount === 0 && (
          <div className="text-center text-gray-500 mt-8">
            No challenges available at this time.
          </div>
        )}
      </div>
    </div>
  )
}
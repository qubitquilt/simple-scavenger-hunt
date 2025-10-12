'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getUserId } from '@/utils/session'
import type { Question } from '@/types/question'
import type { Event } from '@/types/admin'
import LoadingSpinner from '@/components/LoadingSpinner'

interface AnswerResponse {
  status: 'correct' | 'incorrect' | 'pending'
  aiScore?: number
  completed: boolean
  stats: { correctCount: number; totalCount: number }
}

export default function ChallengeDetailPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const eventSlug = params.slug
  const userId = getUserId()

  const [event, setEvent] = useState<Event | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [aiScore, setAiScore] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submission, setSubmission] = useState<string | File | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [hintLoading, setHintLoading] = useState(false)
  const [hintError, setHintError] = useState<string | null>(null)
  const [hintCount, setHintCount] = useState(0)
  const [maxHints, setMaxHints] = useState(2)

  useEffect(() => {
    if (!userId || !eventSlug) {
      router.push('/register')
      return
    }

    const fetchEventAndQuestion = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch event
        const eventResponse = await fetch(`/api/events?slug=${encodeURIComponent(eventSlug)}`)
        if (!eventResponse.ok) {
          if (eventResponse.status === 404) {
            throw new Error('Event not found')
          }
          throw new Error('Failed to fetch event')
        }
        const { event: eventData } = await eventResponse.json()
        setEvent(eventData)

        // Fetch progress for this event
        const progressResponse = await fetch(`/api/progress?eventId=${eventData.id}`)
        if (!progressResponse.ok) {
          throw new Error('Failed to fetch progress')
        }
        const data = await progressResponse.json()

        // Find the current question (first not answered or incorrect)
        const currentQuestion = data.questions.find((q: any) => !q.answered || q.status === 'incorrect')
        if (!currentQuestion) {
          // All completed
          router.push('/challenges')
          return
        }
        setQuestion(currentQuestion)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load challenge')
      } finally {
        setLoading(false)
      }
    }

    fetchEventAndQuestion()
  }, [eventSlug, userId, router])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubmission(e.target.value)
    if (feedback) setFeedback(null)
  }

  const handleMcChange = (value: string) => {
    setSubmission(value)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSubmission(file)
      if (feedback) setFeedback(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question || !submission || submitting) return

    setSubmitting(true)
    setFeedback(null)
    setError(null)

    try {
      let submitData: string | { url: string }
      if (question.type === 'image' && submission instanceof File) {
        // Convert file to base64 data URL
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(submission)
        })
        submitData = { url: base64 }
      } else {
        submitData = submission as string
      }

      const response = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, submission: submitData })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Submission failed')
      }

      const result: AnswerResponse = await response.json()

      if (result.status === 'correct') {
        // Redirect to list
        router.push('/challenges')
        return
      } else {
        // Show feedback for retry (text/image)
        setAiScore(result.aiScore || 0)
        setFeedback(
          question.type === 'text' || question.type === 'image'
            ? `Score: ${result.aiScore || 0}/${question.aiThreshold}. Try again!`
            : 'Incorrect. Please try again.'
        )
        if (question.type !== 'multiple_choice') {
          setSubmission(null) // Clear for retry
        }
      }

      // Announce feedback
      const announcement = document.getElementById('feedback-announce')
      if (announcement) {
        announcement.textContent = feedback
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleHintRequest = async () => {
    if (!question || hintLoading || hintCount >= maxHints) return

    setHintLoading(true)
    setHintError(null)

    try {
      const response = await fetch('/api/hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to get hint')
      }

      const result = await response.json()
      setHint(result.hint)
      setHintCount(result.hintCount)
      setMaxHints(result.maxHints)
    } catch (err) {
      setHintError(err instanceof Error ? err.message : 'Hint error')
    } finally {
      setHintLoading(false)
    }
  }

  const handleHintKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleHintRequest()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
        <div className="sr-only">Loading challenge...</div>
      </div>
    )
  }

  if (error || !question) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600 text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error || 'Challenge not found'}</p>
          <button
            onClick={() => router.push('/challenges')}
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Back to challenges"
          >
            Back to Challenges
          </button>
        </div>
      </div>
    )
  }

  const isTextOrImage = question.type === 'text' || question.type === 'image'
  const isMc = question.type === 'multiple_choice'
  const showRetry = isTextOrImage && feedback && aiScore! < question.aiThreshold

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Challenge</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Back to challenges list"
          >
            ← Back
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2" id="question-content">
            {question.content}
          </h2>
          <p className="text-sm text-gray-600">
            Type: {question.type.replace('_', ' ')} • Threshold: {question.aiThreshold}/10
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isMc && question.options && (
            <fieldset role="radiogroup" aria-labelledby="mc-question-label">
              <legend id="mc-question-label" className="sr-only">
                Select one answer
              </legend>
              {Object.entries(question.options).map(([key, option]) => (
                <div
                  key={key}
                  className="flex items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
                >
                  <input
                    id={`option-${key}`}
                    type="radio"
                    name="mc-answer"
                    value={key}
                    checked={submission === key}
                    onChange={(e) => handleMcChange(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    required
                    disabled={submitting}
                    aria-label={`Option ${key}: ${option}`}
                  />
                  <label
                    htmlFor={`option-${key}`}
                    className="ml-3 block text-sm text-gray-900 cursor-pointer select-none"
                  >
                    {option}
                  </label>
                </div>
              ))}
            </fieldset>
          )}

          {isTextOrImage && !isMc && (
            <div>
              {question.type === 'text' ? (
                <input
                  type="text"
                  value={typeof submission === 'string' ? submission : ''}
                  onChange={handleTextChange}
                  placeholder="Enter your answer..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={!showRetry}
                  aria-describedby={feedback ? 'feedback-announce' : undefined}
                  disabled={submitting}
                />
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required={!showRetry}
                  disabled={submitting}
                  aria-label="Upload image for challenge"
                />
              )}
            </div>
          )}

          {feedback && (
            <div
              id="feedback-announce"
              className={`p-3 rounded-md ${
                aiScore! >= question.aiThreshold ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
              role="alert"
              aria-live="polite"
            >
              {feedback}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-100 text-red-800 rounded-md" role="alert">
              {error}
            </div>
          )}

          {question.hintEnabled && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleHintRequest}
                onKeyDown={handleHintKeyDown}
                disabled={hintLoading || hintCount >= maxHints}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:cursor-not-allowed"
                tabIndex={0}
              >
                {hintLoading ? 'Loading hint...' : hintCount >= maxHints ? `Max hints used (${hintCount}/${maxHints})` : `Need a hint? (${hintCount}/${maxHints})`}
              </button>

              {hint && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md" role="region" aria-labelledby="hint-heading">
                  <h3 id="hint-heading" className="text-sm font-semibold text-yellow-800 mb-1">Hint:</h3>
                  <p className="text-sm text-yellow-700">{hint}</p>
                </div>
              )}

              {hintError && (
                <div className="p-3 bg-red-100 text-red-800 rounded-md" role="alert">
                  {hintError}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!submission || submitting}
            className="w-full bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
            aria-label={submitting ? 'Submitting...' : 'Submit answer'}
          >
            {submitting ? 'Submitting...' : showRetry ? 'Retry' : 'Submit Answer'}
          </button>
        </form>
      </div>
    </div>
  )
}
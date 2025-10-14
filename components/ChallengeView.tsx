'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import type { Question } from '@/types/question'
import type { Event } from '@/types/admin'
import type { Answer } from '@/types/answer'
import { AnswerStatus } from '@/types/answer'
import LoadingSpinner from '@/components/LoadingSpinner'
import ImageQuestion from '@/components/ImageQuestion'

interface ChallengeViewProps {
  question: Question
  event: Event
}

export default function ChallengeView({ question, event }: ChallengeViewProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [aiScore, setAiScore] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submission, setSubmission] = useState<string>('')
  const [hint, setHint] = useState<string | null>(null)
  const [hintLoading, setHintLoading] = useState(false)
  const [hintError, setHintError] = useState<string | null>(null)
  const [hintCount, setHintCount] = useState(0)
  const [maxHints, setMaxHints] = useState(2)

  const isAccepted = answer?.computedStatus === 'accepted'
  const isPendingOrRejected = answer?.computedStatus === 'pending' || answer?.computedStatus === 'rejected' || !answer
  const userAnswer = answer?.submission as string | undefined

  useEffect(() => {
    console.log('ChallengeView useEffect triggered - session status:', status, 'session data:', !!session)
    console.log('ChallengeView - Current loading state:', loading)
    console.log('ChallengeView - Question ID:', question.id)
    console.log('ChallengeView - isAccepted:', isAccepted)
    console.log('ChallengeView - Session object details:', session ? { user: session.user, expires: session.expires } : 'null')

    if (status === 'loading') {
      console.log('ChallengeView - Session still loading, keeping loading true')
      return
    }

    if (status === 'unauthenticated') {
      console.log('ChallengeView - User unauthenticated, setting loading false and showing login prompt')
      setLoading(false)
      return
    }

    if (status === 'authenticated') {
      console.log('ChallengeView - Session authenticated, proceeding with answer fetch')

      const fetchAnswer = async () => {
        try {
          console.log('ChallengeView - Starting answer fetch for questionId:', question.id)
          setLoading(true)
          console.log('ChallengeView - Set loading to true')

          const apiUrl = `/api/answers?questionId=${question.id}`
          console.log('ChallengeView - Fetching from URL:', apiUrl)

          // Add timeout to prevent hanging
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

          const response = await fetch(apiUrl, {
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache'
            }
          })
          clearTimeout(timeoutId)

          console.log('ChallengeView - Fetch response status:', response.status, response.statusText)

          if (response.ok) {
            const responseData = await response.json()
            console.log('ChallengeView - Response data:', responseData)
            const { answer: answerData } = responseData
            console.log('ChallengeView - Extracted answer data:', answerData)
            setAnswer(answerData)
            if (answerData?.submission && !isAccepted) {
              console.log('ChallengeView - Setting submission from existing answer:', answerData.submission)
              setSubmission(answerData.submission)
            }
          } else {
            console.log('ChallengeView - Answer fetch failed with status:', response.status)
            const errorText = await response.text()
            console.log('ChallengeView - Error response body:', errorText)
            setError(`Failed to load answer: ${response.status}`)
          }
        } catch (err) {
          console.error('ChallengeView - Failed to load answer status:', err)
          if (err instanceof Error && err.name === 'AbortError') {
            setError('Request timed out - please check your connection')
          } else {
            setError('Failed to load answer status')
          }
        } finally {
          console.log('ChallengeView - Setting loading to false in finally block')
          setLoading(false)
        }
      }

      fetchAnswer()

      const handleFocus = () => {
        console.log('ChallengeView - Window focus event, refetching answer')
        fetchAnswer()
      }

      window.addEventListener('focus', handleFocus)
      return () => window.removeEventListener('focus', handleFocus)
    } else {
      console.log('ChallengeView - Unexpected session status:', status)
      // Handle unexpected status by setting loading to false
      setLoading(false)
    }
  }, [question.id, session, status, isAccepted])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubmission(e.target.value)
    if (feedback) setFeedback(null)
  }

  const handleMcChange = (value: string) => {
    setSubmission(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!submission || submitting || isAccepted) return

    setSubmitting(true)
    setFeedback(null)
    setError(null)

    try {
      const response = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, submission })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Submission failed')
      }

      const result = await response.json()

      if (result.accepted) {
        router.push(`/events/${event.slug}`)
        return
      } else {
        setAiScore(result.aiScore || 0)
        setFeedback(
          question.type === 'text'
            ? `Score: ${result.aiScore || 0}/${question.aiThreshold}. Try again!`
            : 'Incorrect. Please try again.'
        )
        if (question.type !== 'multiple_choice') {
          setSubmission('')
        }

        const announcement = document.getElementById('feedback-announce')
        if (announcement) {
          announcement.textContent = feedback
        }
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

  const handleImageAnswer = async (url: string) => {
    if (submitting || isAccepted) return

    setSubmitting(true)
    setFeedback(null)
    setError(null)

    try {
      const response = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, submission: url })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Image submission failed')
      }

      const result = await response.json()

      if (result.accepted) {
        router.push(`/events/${event.slug}`)
        return
      } else {
        setAiScore(result.aiScore || 0)
        setFeedback(
          question.type === 'text'
            ? `Score: ${result.aiScore || 0}/${question.aiThreshold}. Try again!`
            : 'Incorrect. Please try again.'
        )
        if (question.type !== 'multiple_choice') {
          setSubmission('')
        }

        const announcement = document.getElementById('feedback-announce')
        if (announcement) {
          announcement.textContent = feedback
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image submission error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title text-2xl mb-4">{question.content}</h1>

            {question.type === 'text' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Your Answer</span>
                  </label>
                  <input
                    type="text"
                    value={submission || ''}
                    onChange={handleTextChange}
                    className="input input-bordered"
                    placeholder="Enter your answer..."
                    disabled={isAccepted || submitting}
                    aria-describedby="feedback-announce"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!submission || submitting || isAccepted}
                  >
                    {submitting ? 'Submitting...' : 'Submit Answer'}
                  </button>

                  {isPendingOrRejected && question.hintEnabled && (
                    <button
                      type="button"
                      onClick={handleHintRequest}
                      className="btn btn-secondary"
                      disabled={hintLoading || hintCount >= maxHints}
                      onKeyDown={handleHintKeyDown}
                      tabIndex={0}
                      aria-label="Request hint"
                    >
                      {hintLoading ? 'Getting Hint...' : `Hint (${hintCount}/${maxHints})`}
                    </button>
                  )}
                </div>
              </form>
            )}

            {question.type === 'multiple_choice' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Choose your answer</span>
                  </label>
                  <ul className="list bg-base-100 rounded-box shadow-md">
                    {question.options && Object.entries(JSON.parse((question.options as unknown) as string) as Record<string, string>).map(([key, value], index) => (
                      <li key={key} className="list-row">
                        <div className="list-col-grow">
                          <label className="label cursor-pointer">
                            <input
                              type="radio"
                              name="answer"
                              value={value}
                              checked={submission === value}
                              onChange={(e) => handleMcChange(e.target.value)}
                              className="radio radio-primary"
                              disabled={isAccepted || submitting}
                            />
                            <span className="label-text ml-2">{value}</span>
                          </label>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!submission || submitting || isAccepted}
                  >
                    {submitting ? 'Submitting...' : 'Submit Answer'}
                  </button>

                  {isPendingOrRejected && question.hintEnabled && (
                    <button
                      type="button"
                      onClick={handleHintRequest}
                      className="btn btn-secondary"
                      disabled={hintLoading || hintCount >= maxHints}
                      onKeyDown={handleHintKeyDown}
                      tabIndex={0}
                      aria-label="Request hint"
                    >
                      {hintLoading ? 'Getting Hint...' : `Hint (${hintCount}/${maxHints})`}
                    </button>
                  )}
                </div>
              </form>
            )}

            {question.type === 'image' && (
              <ImageQuestion
                question={question}
                progress={null}
                onAnswer={handleImageAnswer}
              />
            )}

            {feedback && (
              <div
                id="feedback-announce"
                className={`alert ${aiScore && aiScore >= question.aiThreshold ? 'alert-success' : 'alert-warning'}`}
                role="alert"
                aria-live="polite"
              >
                <span>{feedback}</span>
              </div>
            )}

            {error && (
              <div className="alert alert-error" role="alert">
                <span>{error}</span>
              </div>
            )}

            {hint && (
              <div className="alert alert-info" role="alert">
                <span>💡 {hint}</span>
              </div>
            )}

            {hintError && (
              <div className="alert alert-error" role="alert">
                <span>{hintError}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
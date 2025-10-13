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
  const { data: session } = useSession()
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [aiScore, setAiScore] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submission, setSubmission] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [hintLoading, setHintLoading] = useState(false)
  const [hintError, setHintError] = useState<string | null>(null)
  const [hintCount, setHintCount] = useState(0)
  const [maxHints, setMaxHints] = useState(2)

  const isAccepted = answer?.computedStatus === 'accepted'
  const isPendingOrRejected = answer?.computedStatus === 'pending' || answer?.computedStatus === 'rejected' || !answer
  const userAnswer = answer?.submission as string | undefined

  useEffect(() => {
    if (!session) {
      return
    }

    const fetchAnswer = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/answers?questionId=${question.id}`)
        if (response.ok) {
          const { answer: answerData } = await response.json()
          setAnswer(answerData)
          if (answerData?.submission && !isAccepted) {
            setSubmission(answerData.submission)
          }
        }
      } catch (err) {
        setError('Failed to load answer status')
      } finally {
        setLoading(false)
      }
    }

    fetchAnswer()

    const handleFocus = () => {
      fetchAnswer()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [question.id, session, isAccepted])

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

                  {isPendingOrRejected && (
                    <button
                      type="button"
                      onClick={handleHintRequest}
                      className="btn btn-outline"
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
                  <div className="space-y-2">
                    {question.options && Object.entries(question.options).map(([key, value]) => (
                      <label key={key} className="label cursor-pointer">
                        <input
                          type="radio"
                          name="answer"
                          value={value}
                          checked={submission === value}
                          onChange={() => handleMcChange(value)}
                          className="radio radio-primary"
                          disabled={isAccepted || submitting}
                        />
                        <span className="label-text ml-2">{value}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!submission || submitting || isAccepted}
                >
                  {submitting ? 'Submitting...' : 'Submit Answer'}
                </button>
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
                {feedback}
              </div>
            )}

            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}

            {hint && (
              <div className="alert alert-info">
                <div className="flex-1">
                  <strong>Hint:</strong> {hint}
                </div>
              </div>
            )}

            {hintError && (
              <div className="alert alert-error">
                {hintError}
              </div>
            )}

            {isAccepted && (
              <div className="alert alert-success">
                <div className="flex-1">
                  <strong>Correct!</strong> Well done!
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

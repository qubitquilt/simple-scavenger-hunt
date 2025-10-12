'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getUserId } from '@/utils/session'
import type { Event } from '@/types/admin'
import LoadingSpinner from '@/components/LoadingSpinner'

interface ProgressData {
  progress: {
    id: string
    completed: boolean
  }
  stats?: {
    completedCount: number
    totalCount: number
  }
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const userId = getUserId()

  const [event, setEvent] = useState<Event | null>(null)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('Progress state updated:', progress)
  }, [progress])
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  })

  useEffect(() => {
    if (!slug) return

    const fetchEventAndProgress = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch event
        const eventResponse = await fetch(`/api/events?slug=${encodeURIComponent(slug)}`)
        if (!eventResponse.ok) {
          if (eventResponse.status === 404) {
            throw new Error('Event not found')
          }
          throw new Error('Failed to fetch event')
        }
        const { event: eventData } = await eventResponse.json()
        setEvent(eventData)

        // Check if user has progress for this event
        if (userId) {
          const progressResponse = await fetch(`/api/progress?eventId=${eventData.id}`)
          if (progressResponse.ok) {
            const progressData = await progressResponse.json()
            console.log('Fetched progress data in useEffect for event', eventData.id, ':', progressData)
            setProgress(progressData)
          }
          // If 404, user is not registered - that's expected
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load event')
      } finally {
        setLoading(false)
      }
    }

    fetchEventAndProgress()
  }, [slug, userId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event || registering) return

    setRegistering(true)
    setError(null)

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          eventId: event.id
        })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Registration failed')
      }

      // Refresh progress data
      const progressResponse = await fetch(`/api/progress?eventId=${event.id}`)
      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        console.log('Fetched progress data after registration for event', event.id, ':', progressData)
        setProgress(progressData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  const handleStartChallenges = () => {
    if (event) {
      router.push(`/challenges/${event.slug}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
        <div className="sr-only">Loading event...</div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600 text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error || 'Event not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Back to home"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  const isRegistered = !!progress

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Back to previous page"
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

        {isRegistered ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h2 className="text-lg font-semibold text-green-800 mb-2">You're Registered!</h2>
              <p className="text-green-700">
                Progress: {progress?.stats?.completedCount ?? 0}/{progress?.stats?.totalCount ?? 0} challenges completed
              </p>
              {progress?.progress?.completed && (
                <p className="text-green-700 font-semibold">🎉 Event completed!</p>
              )}
            </div>

            <button
              onClick={handleStartChallenges}
              className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Start or continue challenges"
            >
              {progress.progress.completed ? 'View Completed Challenges' : 'Continue Challenges'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">Register for this Event</h2>
              <p className="text-blue-700">Fill out the form below to start participating.</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-required="true"
                  disabled={registering}
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-required="true"
                  disabled={registering}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-100 text-red-800 rounded-md" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={registering || !formData.firstName || !formData.lastName}
                className="w-full bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
                aria-label={registering ? 'Registering...' : 'Register for event'}
              >
                {registering ? 'Registering...' : 'Register'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
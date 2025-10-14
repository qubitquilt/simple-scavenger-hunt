'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface FormData {
  firstName: string
  lastName: string
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormData>({ firstName: '', lastName: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('eventId')

  useEffect(() => {
    // Check if user is already authenticated
    const userId = document.cookie.split('; ').find(row => row.startsWith('userId='))?.split('=')[1]
    if (userId) {
      console.log('User already authenticated with userId:', userId)
      // If we have an eventId, redirect to event-specific challenges
      // Otherwise, redirect to generic challenges (fallback)
      const redirectPath = eventId ? `/events/${eventId}` : '/challenges'
      router.push(redirectPath)
      return
    }
    console.log('No existing user session found')
  }, [router, eventId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          eventId: eventId // Pass eventId to registration API
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Registration failed')
      }

      const data = await response.json()
      // Redirect to event-specific challenges page instead of generic challenges
      const redirectPath = eventId ? `/events/${eventId}` : '/challenges'
      router.push(redirectPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-base-200">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Register for Scavenger Hunt</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              aria-describedby="firstName-error"
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
              aria-describedby="lastName-error"
            />
          </div>
          {error && (
            <div id="error" className="text-red-600 text-sm" role="alert">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-block"
            aria-label="Register and start the scavenger hunt"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  )
}
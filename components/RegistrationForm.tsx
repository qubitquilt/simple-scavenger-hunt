'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Event } from '@/types/admin'

export default function RegistrationForm({ event, onSuccess }: { event: Event; onSuccess?: () => void }) {
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: ''
  })
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (registering) return

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

      console.log('Registration successful, calling onSuccess callback')
      onSuccess?.() // Call the onSuccess callback to update progress data

      router.refresh() // Revalidate server data
      router.push(`/events/${event.slug}`) // Stay on page to see updated view
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  return (
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
  )
}

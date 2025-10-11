'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Confetti from 'react-confetti'
import { getUserId } from '@/utils/session'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function CompletionPage() {
  const [showConfetti, setShowConfetti] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const userId = getUserId()

  useEffect(() => {
    if (!userId) {
      router.push('/register')
      return
    }

    const verifyCompletion = async () => {
      try {
        const response = await fetch('/api/progress')
        if (!response.ok) {
          throw new Error('Failed to verify completion')
        }
        const data = await response.json()
        if (!data.progress.completed) {
          router.push('/challenges')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification error')
      } finally {
        setLoading(false)
      }
    }

    verifyCompletion()
  }, [userId, router])

  const handleRestart = () => {
    // Clear userId cookie and redirect to home
    document.cookie = 'userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    router.push('/')
  }

  const handleHome = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
        <div className="sr-only">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600 text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button
            onClick={handleHome}
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Go home"
          >
            Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 relative">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          onConfettiComplete={() => setShowConfetti(false)}
          aria-hidden="true"
        />
      )}
      
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Congratulations!</h1>
        <p className="text-xl mb-8 text-gray-700">
          You've completed all the challenges! 🎉
        </p>
        <p className="text-lg mb-8 text-gray-600">
          Contact the organizers on October 14, 2025 to claim your prize.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={handleRestart}
            className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            aria-label="Start a new scavenger hunt"
          >
            Start New Hunt
          </button>
          <button
            onClick={handleHome}
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Return to home page"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  )
}
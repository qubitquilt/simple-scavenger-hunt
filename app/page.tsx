'use client'

import { useRouter } from 'next/navigation'
import { getUserId } from '@/utils/session'

export default function LandingPage() {
  const router = useRouter()

  const handleStart = () => {
    const userId = getUserId()
    if (userId) {
      router.push('/challenges')
    } else {
      router.push('/register')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <h1 className="text-4xl font-bold mb-4 text-gray-900">Simple Scavenger Hunt</h1>
      <p className="text-lg mb-8 text-center max-w-md text-gray-600">
        A simple and fun scavenger hunt application to test your skills and have a great time!
      </p>
      <button
        onClick={handleStart}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Start the scavenger hunt"
      >
        Start
      </button>
    </div>
  )
}
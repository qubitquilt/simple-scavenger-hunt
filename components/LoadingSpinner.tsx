'use client'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8'
}

export default function LoadingSpinner({ className = '', size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className={`animate-spin rounded-full border-b-2 border-blue-500 ${sizeClasses[size]} ${className}`} 
         role="status" 
         aria-label="Loading">
      <span className="sr-only">Loading...</span>
    </div>
  )
}
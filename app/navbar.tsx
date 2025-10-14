'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import ThemeToggle from '@/components/ThemeToggle'

const Navbar = () => {
  const { data: session } = useSession()
  const isRegistered = !!session?.user
  console.log('Session in Navbar:', session)

  return (
    <div className="navbar bg-base-100 shadow-lg">
      <div className="navbar-start">
        <Link
          href="/challenges"
          className="btn btn-ghost normal-case text-xl"
          aria-label={isRegistered ? 'Go to challenges' : 'Go to home page'}
        >
          Scavenger Hunt
        </Link>
      </div>
      <div className="navbar-end">
        <ThemeToggle />
      </div>
    </div>
  )
}

export default Navbar
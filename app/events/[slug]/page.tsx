import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Event } from '@/types/admin'
import EventQuestionsList from '@/components/EventQuestionsList'

async function getEvent(slug: string): Promise<Event> {
  const event = await prisma.event.findUnique({
    where: { slug }
  })

  if (!event) {
    notFound()
  }

  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    description: event.description || '',
    date: event.date,
    createdAt: event.createdAt
  }
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  const event = await getEvent(params.slug)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <EventQuestionsList event={event} />
      </div>
    </div>
  )
}
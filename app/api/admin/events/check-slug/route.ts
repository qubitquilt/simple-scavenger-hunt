import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await request.json()

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Slug is required and must be a string' }, { status: 400 })
    }

    const existingEvent = await prisma.event.findUnique({
      where: { slug },
      select: { id: true }
    })

    const available = !existingEvent
    return NextResponse.json({ available })
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/events/check-slug:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
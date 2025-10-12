import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { Event } from '@/types/admin'
import { createAdminSupabaseClient } from '@/lib/supabase'

export async function GET() {
  try {
    // Temporarily disabled for curl testing
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.admin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    console.log('Service key loaded:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('Key prefix:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + '...');
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 })
    }
    const adminSupabase = createAdminSupabaseClient()
    const { data: eventsData, error } = await adminSupabase
      .from('events')
      .select('id, title, slug, description, date, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Unexpected error in GET /api/admin/events:', error)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }

    const typedEvents: Event[] = (eventsData || []).map((event) => ({
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description || '',
      date: event.date ? new Date(event.date).toISOString() : '',
      createdAt: new Date(event.created_at).toISOString()
    }))

    return NextResponse.json({ events: typedEvents })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/events:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, slug, description, date } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 })
    }

    const adminSupabase = createAdminSupabaseClient()
    const parsedDate = date ? new Date(date) : new Date('2025-10-14')
    const { data: eventData, error } = await adminSupabase
      .from('events')
      .insert({
        title,
        slug,
        description: description || null,
        date: parsedDate
      })
      .select()
      .single()

    if (error) {
      console.error('Unexpected error in POST /api/admin/events:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const typedEvent: Event = {
      id: eventData.id,
      title: eventData.title,
      slug: eventData.slug,
      description: eventData.description || '',
      date: eventData.date ? new Date(eventData.date).toISOString() : '',
      createdAt: new Date(eventData.created_at).toISOString()
    }
    return NextResponse.json({ event: typedEvent }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, title, slug, description, date } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const adminSupabase = createAdminSupabaseClient()
    const parsedDate = date ? new Date(date) : new Date('2025-10-14')
    const { data: eventData, error } = await adminSupabase
      .from('events')
      .update({
        title,
        slug,
        description: description || null,
        date: parsedDate
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error updating event:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!eventData) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const typedEvent: Event = {
      id: eventData.id,
      title: eventData.title,
      slug: eventData.slug,
      description: eventData.description || '',
      date: eventData.date ? new Date(eventData.date).toISOString() : '',
      createdAt: new Date(eventData.created_at).toISOString()
    }
    return NextResponse.json({ event: typedEvent })
  } catch (error) {
    console.error('Unexpected error in PUT /api/admin/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const adminSupabase = createAdminSupabaseClient()

    const { data: existingEvent, error: selectError } = await adminSupabase
      .from('events')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (selectError) {
      console.error('Supabase error selecting event:', selectError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const { error: deleteError } = await adminSupabase
      .from('events')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Supabase error deleting event:', deleteError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
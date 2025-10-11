import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/types/admin'

export async function GET() {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const typedEvents: Event[] = events || []
  return NextResponse.json({ events: typedEvents })
}

export async function POST(request: NextRequest) {
  try {
    const { title, description, date } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('events')
      .insert({ title, description, date: date || '2025-10-14' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const typedEvent: Event = data
    return NextResponse.json({ event: typedEvent }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, title, description, date } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('events')
      .update({ title, description, date: date || '2025-10-14' })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const typedEvent: Event = data
    return NextResponse.json({ event: typedEvent })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
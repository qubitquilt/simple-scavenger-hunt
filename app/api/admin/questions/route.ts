import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Question } from '@/types/question'
import type { Event } from '@/types/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    let query = supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data: questions, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const typedQuestions: Question[] = questions || []
    return NextResponse.json({ questions: typedQuestions })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { eventId, type, content, options, expectedAnswer, aiThreshold } = await request.json()

    if (!eventId || !content || !expectedAnswer) {
      return NextResponse.json({ error: 'eventId, content, and expectedAnswer are required' }, { status: 400 })
    }

    // Verify event exists
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const questionData = {
      event_id: eventId,
      type,
      content,
      options: options ? JSON.stringify(options) : null,
      expected_answer: expectedAnswer,
      ai_threshold: aiThreshold || 8,
    }

    const { data, error } = await supabase
      .from('questions')
      .insert(questionData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const typedQuestion: Question = data
    return NextResponse.json({ question: typedQuestion }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, eventId, type, content, options, expectedAnswer, aiThreshold } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updateData: Record<string, any> = {
      type,
      content,
      options: options ? JSON.stringify(options) : null,
      expected_answer: expectedAnswer,
      ai_threshold: aiThreshold || 8,
    }

    if (eventId) {
      // Verify event exists
      const { data: event } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .single()

      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      updateData.event_id = eventId
    }

    const { data, error } = await supabase
      .from('questions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const typedQuestion: Question = data
    return NextResponse.json({ question: typedQuestion })
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
      .from('questions')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Question deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
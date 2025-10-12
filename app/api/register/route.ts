import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'

function shuffleArray(array: string[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName } = await request.json()

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'firstName and lastName are required' }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 })
    }

    const adminSupabase = createAdminSupabaseClient();


    // Check if user exists by name
    const { data: existingUser, error: userError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('first_name', firstName)
      .eq('last_name', lastName)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      if (userError.code === '42501') {
        return NextResponse.json({ error: 'Access denied: Insufficient permissions' }, { status: 403 })
      }
      console.error('User check error:', userError)
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      // Create new user
      const { data: newUser, error: createError } = await adminSupabase
        .from('users')
        .insert({
          first_name: firstName,
          last_name: lastName
        })
        .select()
        .single()

      if (createError) {
        if (createError.code === '42501') {
          return NextResponse.json({ error: 'Access denied: Insufficient permissions' }, { status: 403 })
        }
        console.error('User create error:', createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      userId = newUser.id
    }

    // Fetch default event (first event)
    const { data: events, error: eventsError } = await adminSupabase
      .from('events')
      .select('id')
      .order('id')
      .limit(1)

    if (eventsError) {
      if (eventsError.code === '42501') {
        return NextResponse.json({ error: 'Access denied: Insufficient permissions' }, { status: 403 })
      }
      console.error('Events fetch error:', eventsError)
      return NextResponse.json({ error: eventsError.message }, { status: 500 })
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ error: 'No events found' }, { status: 404 })
    }

    const eventId = events[0].id

    // Fetch questions for the event
    const { data: questions, error: questionsError } = await adminSupabase
      .from('questions')
      .select('id')
      .eq('event_id', eventId)

    if (questionsError) {
      if (questionsError.code === '42501') {
        return NextResponse.json({ error: 'Access denied: Insufficient permissions' }, { status: 403 })
      }
      console.error('Questions fetch error:', questionsError)
      return NextResponse.json({ error: questionsError.message }, { status: 500 })
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions found for this event' }, { status: 404 })
    }

    const questionIds = questions.map(q => q.id)
    const shuffledOrder = shuffleArray([...questionIds])

    // Check if progress exists
    const { data: existingProgress, error: existingError } = await adminSupabase
      .from('progress')
      .select('id, question_order, completed')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      if (existingError.code === '42501') {
        return NextResponse.json({ error: 'Access denied: Insufficient permissions' }, { status: 403 })
      }
      console.error('Progress check error:', existingError)
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    if (existingProgress) {
      // Update existing
      const { data: updatedProgress, error: updateError } = await adminSupabase
        .from('progress')
        .update({
          question_order: shuffledOrder,
          completed: false
        })
        .eq('id', existingProgress.id)
        .select()
        .single()

      if (updateError) {
        if (updateError.code === '42501') {
          return NextResponse.json({ error: 'Access denied: Insufficient permissions' }, { status: 403 })
        }
        console.error('Progress update error:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    } else {
      // Create new progress
      const { data: newProgress, error: createError } = await adminSupabase
        .from('progress')
        .insert({
          user_id: userId,
          event_id: eventId,
          question_order: shuffledOrder,
          completed: false
        })
        .select()
        .single()

      if (createError) {
        if (createError.code === '42501') {
          return NextResponse.json({ error: 'Access denied: Insufficient permissions' }, { status: 403 })
        }
        console.error('Progress create error:', createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }
    }

    // Set cookie
    const response = NextResponse.json({ userId })
    response.cookies.set('userId', userId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    })

    return response
  } catch (error) {
    console.error('Register route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
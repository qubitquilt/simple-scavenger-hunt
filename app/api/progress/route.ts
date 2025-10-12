import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Progress, Question } from '@/types/question'
import type { Answer } from '@/types/answer'

function shuffleArray(array: string[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

export async function POST(request: NextRequest) {
  try {
    const { eventId } = await request.json()

    const userId = request.cookies.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 })
    }

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    // Fetch questions for the event
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id')
      .eq('event_id', eventId)

    if (questionsError) {
      return NextResponse.json({ error: questionsError.message }, { status: 500 })
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions found for this event' }, { status: 404 })
    }

    const questionIds = questions.map((q: { id: string }) => q.id)
    const shuffledOrder = shuffleArray([...questionIds])

    // Check if progress exists
    const { data: existingProgress, error: existingError } = await supabase
      .from('progress')
      .select('id, question_order, completed')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single()

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is no rows
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    let progressId: string

    if (existingProgress) {
      // Update existing
      const { data: updatedProgress, error: updateError } = await supabase
        .from('progress')
        .update({ 
          question_order: shuffledOrder,
          completed: false 
        })
        .eq('id', existingProgress.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      progressId = updatedProgress!.id
    } else {
      // Create new
      const { data: newProgress, error: createError } = await supabase
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
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      progressId = newProgress!.id
    }

    return NextResponse.json({ progressId, questionOrder: shuffledOrder })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    let targetEventId: string

    if (eventId) {
      // Verify event exists
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .single()

      if (eventError) {
        if (eventError.code === 'PGRST116') {
          return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }
        return NextResponse.json({ error: eventError.message }, { status: 500 })
      }

      targetEventId = event.id
    } else {
      // Fetch default event (first event)
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id')
        .order('id')
        .limit(1)

      if (eventsError) {
        return NextResponse.json({ error: eventsError.message }, { status: 500 })
      }

      if (!events || events.length === 0) {
        return NextResponse.json({ error: 'No events found' }, { status: 404 })
      }

      targetEventId = events[0].id
    }

    // Fetch progress
    const { data: progressData, error: progressError } = await supabase
      .from('progress')
      .select('id, question_order, completed')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single()

    if (progressError && progressError.code !== 'PGRST116') {
      return NextResponse.json({ error: progressError.message }, { status: 500 })
    }

    if (!progressData) {
      return NextResponse.json({ error: 'No progress found for user' }, { status: 404 })
    }

    const progress: Progress = {
      id: progressData.id,
      userId,
      eventId: targetEventId,
      questionOrder: progressData.question_order as string[],
      completed: progressData.completed,
      createdAt: new Date().toISOString()
    }

    if (progress.completed) {
      return NextResponse.json({ progress, questions: [] })
    }

    // Fetch questions in order with full details
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('id, type, content, options, expected_answer, ai_threshold')
      .in('id', progress.questionOrder)

    if (questionsError) {
      return NextResponse.json({ error: questionsError.message }, { status: 500 })
    }

    // Fetch answers for this progress
    const { data: answersData, error: answersError } = await supabase
      .from('answers')
      .select('question_id, status, ai_score')
      .eq('progress_id', progress.id)

    if (answersError) {
      return NextResponse.json({ error: answersError.message }, { status: 500 })
    }

    interface AnswerMapValue {
      status: string;
      aiScore: number;
    }

    const typedAnswersData = answersData as { question_id: string; status: string; ai_score: number }[] || [];
    const answersMap = new Map<string, AnswerMapValue>(
      typedAnswersData.map(a => [a.question_id, { status: a.status, aiScore: a.ai_score }])
    )

    const typedQuestionsData = questionsData as { id: string; type: string; content: string; options: string | null; expected_answer: string; ai_threshold: number }[] || [];
    const questions: (Question & { answered?: boolean; status?: 'pending' | 'correct' | 'incorrect'; aiScore?: number })[] =
      typedQuestionsData.map((q: any) => {
        const answer = answersMap.get(q.id)
        return {
          id: q.id,
          eventId: targetEventId,
          type: q.type,
          content: q.content,
          options: q.options ? JSON.parse(q.options as unknown as string) : undefined,
          expectedAnswer: q.expected_answer,
          aiThreshold: q.ai_threshold,
          createdAt: new Date().toISOString(),
          answered: !!answer,
          status: answer?.status as 'pending' | 'correct' | 'incorrect' | undefined,
          aiScore: answer?.aiScore
        }
      })

    // Compute completed count
    const completedCount = questions.filter(q => q.status === 'correct').length
    const totalCount = questions.length

    return NextResponse.json({ 
      progress, 
      questions, 
      stats: { completedCount, totalCount } 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
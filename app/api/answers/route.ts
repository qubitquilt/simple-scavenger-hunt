import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { AnswerSubmission } from '@/types/answer'
import type { Question } from '@/types/question'


export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 })
    }

    const body: AnswerSubmission & { progressId?: string } = await request.json()

    const { questionId, submission } = body

    if (!questionId || submission === undefined || submission === null) {
      return NextResponse.json({ error: 'questionId and submission are required' }, { status: 400 })
    }

    // Fetch progress to get progressId and eventId
    const { data: progressData, error: progressError } = await supabase
      .from('progress')
      .select('id, event_id')
      .eq('user_id', userId)
      .single()

    if (progressError) {
      return NextResponse.json({ error: progressError.message }, { status: 500 })
    }

    if (!progressData) {
      return NextResponse.json({ error: 'No progress found for user' }, { status: 404 })
    }

    const { id: progressId, event_id: eventId } = progressData

    // Fetch question
    const { data: questionData, error: questionError } = await supabase
      .from('questions')
      .select('type, expected_answer, ai_threshold, content')
      .eq('id', questionId)
      .eq('event_id', eventId)
      .single()

    if (questionError) {
      return NextResponse.json({ error: questionError.message }, { status: 500 })
    }

    if (!questionData) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const { type, expected_answer: expectedAnswer, ai_threshold: aiThreshold, content } = questionData

    let status: 'correct' | 'incorrect' | 'pending' = 'pending'
    let aiScore: number | null = null

    // Prepare submission for storage
    let storedSubmission: string | object = typeof submission === 'string' ? submission : { url: submission.url }

    // Check if answer already exists
    const { data: existingAnswer, error: existingError } = await supabase
      .from('answers')
      .select('id, status, ai_score')
      .eq('progress_id', progressId)
      .eq('question_id', questionId)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    // AI analysis for all types: text, multiple_choice, image
    let messages: any[] = []
    let explanation = 'Validation completed'

    const imageUrl = typeof submission === 'string' ? submission : submission.url

    if (type === 'image') {
      const prompt = `The challenge is: "${content}". The expected description is: "${expectedAnswer}". Analyze the image at URL: ${imageUrl} to see if it matches the expected answer. Rate the similarity on a scale of 0 to 10. Provide a brief explanation of why you gave that score.

Respond in this exact format:

Score: [number 0-10]

Explanation: [brief explanation]`

      messages = [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }]
    } else {
      // text or multiple_choice
      const answerType = type === 'multiple_choice' ? 'multiple choice selection' : 'text answer'
      const userInputTerm = type === 'multiple_choice' ? 'selection' : 'answer'
      const prompt = `The challenge is a ${answerType}: "${content}". The expected ${userInputTerm} is: "${expectedAnswer}". The user's ${userInputTerm}: "${submission}". Rate the similarity between the user's ${userInputTerm} and the expected one on a scale of 0 to 10. Provide a brief explanation of why you gave that score.

Respond in this exact format:

Score: [number 0-10]

Explanation: [brief explanation]`

      messages = [{ role: 'user', content: prompt }]
    }

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages,
        temperature: 0,
      }),
    })

    if (!openRouterResponse.ok) {
      throw new Error(`OpenRouter API error: ${openRouterResponse.statusText}`)
    }

    const data = await openRouterResponse.json()
    const text = data.choices[0].message.content.trim()

    // Parse score and explanation
    const scoreMatch = text.match(/Score:\s*(\d+)/i)
    const explanationMatch = text.match(/Explanation:\s*(.+)$/i, 'm')

    aiScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 0
    explanation = explanationMatch ? explanationMatch[1].trim() : 'Unable to parse AI response'

    if (isNaN(aiScore) || aiScore < 0 || aiScore > 10) {
      aiScore = 0
    }

    if (aiScore >= aiThreshold) {
      status = 'correct'
    } else {
      status = 'incorrect'
    }

    // Insert or update answer
    const answerData = {
      progress_id: progressId,
      question_id: questionId,
      submission: storedSubmission,
      ai_score: aiScore,
      status
    }

    let answerId: string

    if (existingAnswer) {
      // Update
      const { data: updatedAnswer, error: updateError } = await supabase
        .from('answers')
        .update(answerData)
        .eq('id', existingAnswer.id)
        .select('id')
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      answerId = updatedAnswer!.id
    } else {
      // Insert
      const { data: newAnswer, error: insertError } = await supabase
        .from('answers')
        .insert(answerData)
        .select('id')
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      answerId = newAnswer!.id
    }

    // Check if all questions completed
    const { data: allAnswers, error: allAnswersError } = await supabase
      .from('answers')
      .select('status')
      .eq('progress_id', progressId)

    if (allAnswersError) {
      return NextResponse.json({ error: allAnswersError.message }, { status: 500 })
    }

    const totalQuestions = allAnswers?.length || 0
    const correctCount = allAnswers?.filter(a => a.status === 'correct').length || 0

    let completed = false
    if (totalQuestions > 0 && correctCount === totalQuestions) {
      completed = true
      // Update progress
      const { error: completeError } = await supabase
        .from('progress')
        .update({ completed: true })
        .eq('id', progressId)

      if (completeError) {
        console.error('Failed to update progress completed:', completeError)
        // Don't fail the request
      }
    }

    return NextResponse.json({
      answerId,
      status,
      aiScore,
      explanation,
      completed,
      stats: { correctCount, totalQuestions }
    })
  } catch (error) {
    console.error('Answers API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
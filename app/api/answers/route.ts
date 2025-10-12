import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    const progressData = await prisma.progress.findFirst({
      where: { userId },
      select: { id: true, eventId: true }
    })

    if (!progressData) {
      return NextResponse.json({ error: 'No progress found for user' }, { status: 404 })
    }

    const { id: progressId, eventId } = progressData

    // Fetch question
    const questionData = await prisma.question.findFirst({
      where: {
        id: questionId,
        eventId
      },
      select: {
        type: true,
        expectedAnswer: true,
        aiThreshold: true,
        content: true
      }
    })

    if (!questionData) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const { type, expectedAnswer, aiThreshold, content } = questionData

    let status: 'correct' | 'incorrect' | 'pending' = 'pending'
    let aiScore: number | null = null

    // Prepare submission for storage
    let storedSubmission: string | object = typeof submission === 'string' ? submission : { url: submission.url }

    // Check if answer already exists
    const existingAnswer = await prisma.answer.findFirst({
      where: {
        progressId,
        questionId
      },
      select: {
        id: true,
        status: true,
        aiScore: true
      }
    })

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
      progressId,
      questionId,
      submission: storedSubmission,
      aiScore,
      status
    }

    let answerId: string

    if (existingAnswer) {
      // Update
      const updatedAnswer = await prisma.answer.update({
        where: { id: existingAnswer.id },
        data: answerData,
        select: { id: true }
      })
      answerId = updatedAnswer.id
    } else {
      // Insert
      const newAnswer = await prisma.answer.create({
        data: answerData,
        select: { id: true }
      })
      answerId = newAnswer.id
    }

    // Check if all questions completed
    const allAnswers = await prisma.answer.findMany({
      where: { progressId },
      select: { status: true }
    })

    const totalQuestions = allAnswers.length
    const correctCount = allAnswers.filter(a => a.status === 'correct').length

    let completed = false
    if (totalQuestions > 0 && correctCount === totalQuestions) {
      completed = true
      // Update progress
      await prisma.progress.update({
        where: { id: progressId },
        data: { completed: true }
      }).catch(error => {
        console.error('Failed to update progress completed:', error)
        // Don't fail the request
      })
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
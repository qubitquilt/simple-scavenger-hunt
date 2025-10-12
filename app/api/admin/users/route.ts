import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase'
import type { UserProgress, AdminMetrics } from '@/types/admin'
import type { User } from '@/types/user'
import type { Answer } from '@/types/answer'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const completed = searchParams.get('completed') === 'true'
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 })
    }

    const adminSupabase = createAdminSupabaseClient()

    let query = adminSupabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        progress!inner (
          id,
          event_id,
          completed,
          created_at,
          answers (
            id,
            question_id,
            status,
            created_at
          )
        )
      `)
      .eq('progress.event_id', eventId)

    if (completed !== undefined) {
      query = query.eq('progress.completed', completed)
    }

    console.log('Users query executed')
    const { data: usersData, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const users: UserProgress[] = (usersData || []).map(user => {
      const progress = user.progress[0]
      const mappedAnswers: Answer[] = (progress.answers || []).map((a: any) => ({
        id: a.id,
        progressId: progress.id,
        questionId: a.question_id,
        submission: null,
        aiScore: undefined,
        status: a.status,
        createdAt: a.created_at,
      }))
      const completedQuestions = mappedAnswers.filter(a => a.status === 'correct').length
      const totalQuestions = mappedAnswers.length

      return {
        id: user.id,
        userId: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        eventId: progress.event_id,
        eventTitle: '', // Would need to join with events if needed
        completed: progress.completed,
        completedQuestions,
        totalQuestions,
        createdAt: progress.created_at,
        answers: mappedAnswers,
      }
    })

    // Compute metrics
    const totalUsers = users.length
    const completedUsers = users.filter(u => u.completed).length
    const completionRate = totalUsers > 0 ? Math.round((completedUsers / totalUsers) * 100) : 0

    // Average completion time (simplified: from created_at to now for completed)
    const avgCompletionTime = users
      .filter(u => u.completed)
      .reduce((sum, u) => {
        const created = new Date(u.createdAt)
        const now = new Date()
        const diff = (now.getTime() - created.getTime()) / (1000 * 60) // minutes
        return sum + diff
      }, 0) / (completedUsers || 1)

    const topUsers = users
      .filter(u => u.completed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)

    const metrics: AdminMetrics = {
      totalUsers,
      completedUsers,
      completionRate,
      averageCompletionTime: Math.round(avgCompletionTime),
      topUsers,
    }

    return NextResponse.json({ users, metrics })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase'

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

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 })
    }

    const adminSupabase = createAdminSupabaseClient()
    const { data: existingEvent, error } = await adminSupabase
      .from('events')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      console.error('Unexpected error in POST /api/admin/events/check-slug:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const available = !existingEvent
    return NextResponse.json({ available })
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/events/check-slug:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
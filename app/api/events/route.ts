import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client not configured' }, { status: 500 })
  }

  const { data: events, error } = await supabase
    .from('events')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ events })
}
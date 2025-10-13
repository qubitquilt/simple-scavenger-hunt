#!/usr/bin/env ts-node
import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  console.log('Starting recompute-progress...')
  const progresses = await prisma.progress.findMany({
    select: { id: true, questionOrder: true, eventId: true, completed: true }
  })

  let checked = 0
  let updated = 0

  for (const p of progresses) {
    checked++
    let totalQuestions = 0

    if (p.questionOrder && Array.isArray(p.questionOrder) && p.questionOrder.length > 0) {
      totalQuestions = (p.questionOrder as any[]).length
    } else if (p.eventId) {
      totalQuestions = await prisma.question.count({ where: { eventId: p.eventId } })
    }

    const correctCount = await prisma.answer.count({
      where: { progressId: p.id, status: 'correct' }
    })

    const shouldCompleted = totalQuestions > 0 && correctCount === totalQuestions

    if (p.completed !== shouldCompleted) {
      await prisma.progress.update({
        where: { id: p.id },
        data: { completed: shouldCompleted }
      })
      updated++
      console.log(`Updated progress ${p.id}: completed ${p.completed} -> ${shouldCompleted} (correct=${correctCount}, total=${totalQuestions})`)
    }
  }

  console.log(`Done. checked=${checked} updated=${updated}`)
}

main().catch(err => {
  console.error('Error in recompute-progress:', err)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
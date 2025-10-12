-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('text', 'multiple_choice', 'image');

-- CreateEnum
CREATE TYPE "AnswerStatus" AS ENUM ('pending', 'correct', 'incorrect');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT 'default-slug',
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT '2025-10-14 00:00:00 +00:00',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "type" "QuestionType" NOT NULL,
    "content" TEXT NOT NULL,
    "options" JSONB,
    "expected_answer" TEXT,
    "ai_threshold" INTEGER NOT NULL DEFAULT 8,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "question_order" JSONB NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "progress_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "submission" JSONB,
    "aiScore" INTEGER,
    "status" "AnswerStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "progress_user_id_event_id_key" ON "progress"("user_id", "event_id");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_progress_id_fkey" FOREIGN KEY ("progress_id") REFERENCES "progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on all tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "answers" ENABLE ROW LEVEL SECURITY;

-- Basic policies: Public read for events and questions
CREATE POLICY "Public read events" ON "events" FOR SELECT USING (true);
CREATE POLICY "Public read questions" ON "questions" FOR SELECT USING (true);

-- Users can insert their own record (assuming auth later, for now allow insert)
CREATE POLICY "Users can insert own" ON "users" FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read own" ON "users" FOR SELECT USING (true);
CREATE POLICY "Users can update own" ON "users" FOR UPDATE USING (true);

-- Progress: Users can insert/update own
CREATE POLICY "Users insert own progress" ON "progress" FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update own progress" ON "progress" FOR UPDATE USING (true);
CREATE POLICY "Users read own progress" ON "progress" FOR SELECT USING (true);

-- Answers: Users can insert own via progress
CREATE POLICY "Users insert own answers" ON "answers" FOR INSERT WITH CHECK (true);
CREATE POLICY "Users read own answers" ON "answers" FOR SELECT USING (true);

-- Seed data: Sample event
INSERT INTO "events" ("id", "title", "description") VALUES
('123e4567-e89b-12d3-a456-426614174000', 'QubitQuilt Scavenger Hunt', 'An exciting scavenger hunt event on October 14, 2025');

-- Sample questions
INSERT INTO "questions" ("event_id", "type", "content", "options", "expected_answer", "ai_threshold") VALUES
('123e4567-e89b-12d3-a456-426614174000', 'text', 'What is Artificial Intelligence?', NULL, 'A branch of computer science that aims to create intelligent machines', 8),
('123e4567-e89b-12d3-a456-426614174000', 'multiple_choice', 'Which of the following is a programming language?', '{"A": "Python", "B": "Chocolate", "C": "Apple", "D": "Car"}', 'A', 8),
('123e4567-e89b-12d3-a456-426614174000', 'image', 'Upload a photo of a quantum computer diagram', NULL, 'Image of quantum computer', 7),
('123e4567-e89b-12d3-a456-426614174000', 'text', 'Explain the concept of machine learning in one sentence.', NULL, 'Machine learning is a subset of AI where systems learn from data to improve performance.', 8),
('123e4567-e89b-12d3-a456-426614174000', 'multiple_choice', 'What does AI stand for?', '{"A": "Artificial Intelligence", "B": "Amazing Ideas", "C": "Auto Innovation", "D": "All Incorrect"}', 'A', 9);


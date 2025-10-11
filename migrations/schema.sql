-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE question_type AS ENUM ('text', 'multiple_choice', 'image');
CREATE TYPE answer_status AS ENUM ('pending', 'correct', 'incorrect');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE DEFAULT '2025-10-14',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  type question_type NOT NULL,
  content TEXT NOT NULL,
  options JSONB,
  expected_answer TEXT,
  ai_threshold INTEGER DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress table
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  question_order JSONB NOT NULL, -- Array of question UUIDs
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- Answers table
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  progress_id UUID REFERENCES progress(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  submission JSONB, -- text or image data
  ai_score INTEGER,
  status answer_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Basic policies: Public read for events and questions
CREATE POLICY "Public read events" ON events FOR SELECT USING (true);
CREATE POLICY "Public read questions" ON questions FOR SELECT USING (true);

-- Users can insert their own record (assuming auth later, for now allow insert)
CREATE POLICY "Users can insert own" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read own" ON users FOR SELECT USING (true);

-- Progress: Users can insert/update own
CREATE POLICY "Users insert own progress" ON progress FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users update own progress" ON progress FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users read own progress" ON progress FOR SELECT USING (auth.uid()::text = user_id::text);

-- Answers: Users can insert own via progress
CREATE POLICY "Users insert own answers" ON answers FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM progress WHERE progress.id = answers.progress_id AND auth.uid()::text = progress.user_id::text));
CREATE POLICY "Users read own answers" ON answers FOR SELECT USING (EXISTS (SELECT 1 FROM progress WHERE progress.id = answers.progress_id AND auth.uid()::text = progress.user_id::text));
-- Grant usage on public schema to service_role
GRANT USAGE ON SCHEMA public TO service_role;

-- Seed data: Sample event
INSERT INTO events (title, description) VALUES 
('QubitQuilt Scavenger Hunt', 'An exciting scavenger hunt event on October 14, 2025');

-- Get the event ID (assuming first event)
DO $$
DECLARE
  event_id UUID;
BEGIN
  SELECT id INTO event_id FROM events LIMIT 1;
  
  -- Sample questions
  INSERT INTO questions (event_id, type, content, options, expected_answer, ai_threshold) VALUES 
  (event_id, 'text', 'What is Artificial Intelligence?', NULL, 'A branch of computer science that aims to create intelligent machines', 8),
  (event_id, 'multiple_choice', 'Which of the following is a programming language?', '{"A": "Python", "B": "Chocolate", "C": "Apple", "D": "Car"}', 'A', 8),
  (event_id, 'image', 'Upload a photo of a quantum computer diagram', NULL, 'Image of quantum computer', 7),
  (event_id, 'text', 'Explain the concept of machine learning in one sentence.', NULL, 'Machine learning is a subset of AI where systems learn from data to improve performance.', 8),
  (event_id, 'multiple_choice', 'What does AI stand for?', '{"A": "Artificial Intelligence", "B": "Amazing Ideas", "C": "Auto Innovation", "D": "All Incorrect"}', 'A', 9);
END $$;
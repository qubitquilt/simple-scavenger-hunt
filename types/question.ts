export interface Question {
  id: string;
  eventId: string;
  type: 'text' | 'multiple_choice' | 'image';
  content: string;
  options?: Record<string, string>;
  expectedAnswer: string;
  aiThreshold: number;
  hintEnabled: boolean;
  createdAt: string;
}

export interface Progress {
  id: string;
  userId: string;
  eventId: string;
  questionOrder: string[];
  completed: boolean;
  createdAt: string;
}

export type { CreateQuestion, UpdateQuestion } from '../lib/validation';
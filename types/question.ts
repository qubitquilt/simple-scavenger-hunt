export interface Question {
  id: string;
  eventId: string;
  type: 'text' | 'multiple_choice' | 'image';
  content: string;
  options?: Record<string, string>;
  expectedAnswer: string;
  aiThreshold: number;
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
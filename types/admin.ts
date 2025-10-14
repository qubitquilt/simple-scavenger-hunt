import { Answer } from "./answer";

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  date: Date;
  createdAt: Date;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  admin: boolean;
}

export interface UserProgress {
  id: string;
  userId: string;
  name: string;
  eventId: string;
  eventTitle: string;
  completed: boolean;
  completedQuestions: number;
  totalQuestions: number;
  answers?: Answer[];
  createdAt: string;
}

export interface AdminMetrics {
  totalUsers: number;
  completedUsers: number;
  completionRate: number; // percentage
  averageCompletionTime?: number; // in minutes
  topUsers: UserProgress[];
}

export interface AdminSession {
  user: AdminUser;
}

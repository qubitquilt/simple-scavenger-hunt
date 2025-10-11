export interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // ISO date string
  createdAt: string;
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
  firstName: string;
  lastName: string;
  eventId: string;
  eventTitle: string;
  completed: boolean;
  completedQuestions: number;
  totalQuestions: number;
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
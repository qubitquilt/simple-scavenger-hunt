export type AnswerStatus = "pending" | "accepted" | "rejected";

export interface Answer {
  id: string;
  progressId: string;
  questionId: string;
  submission: any; // JSONB: string for text/MC, object for image {url: string}
  aiScore?: number;
  status: "pending" | "correct" | "incorrect";
  computedStatus?: AnswerStatus;
  createdAt: string;
}

export interface AnswerSubmission {
  questionId: string;
  submission: string | { url: string } | string; // text str, image {url}, MC choice str
}

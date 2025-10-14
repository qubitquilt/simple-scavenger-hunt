import { JsonValue } from "@prisma/client/runtime/library";

export enum QuestionType {
  TEXT = "text",
  MULTIPLE_CHOICE = "multiple_choice",
  IMAGE = "image",
}

export interface Question {
  id: string;
  eventId: string;
  type: QuestionType;
  title: string;
  content: string;
  options?: string | Record<string, string>;
  expectedAnswer: string | null;
  aiThreshold: number;
  hintEnabled: boolean;
  imageDescription?: string | null;
  allowedFormats?: ("jpg" | "png" | "gif")[] | null;
  maxFileSize?: number | null;
  minResolution?: { width: number; height: number } | null;
  required?: boolean | null;
  createdAt: string;
}

export interface ImageQuestion
  extends Omit<Question, "imageDescription" | "allowedFormats"> {
  imageDescription: string;
  allowedFormats: ("jpg" | "png" | "gif")[];
}

export interface Progress {
  id: string;
  userId: string;
  eventId: string;
  questionOrder: string[];
  completed: boolean;
  createdAt: string;
}

export type {
  CreateQuestion,
  UpdateQuestion,
  ImageQuestionData,
} from "../lib/validation";

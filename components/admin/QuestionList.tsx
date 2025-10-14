"use client";

import { FC } from "react";
import { Question } from "@/types/question";
import QuestionListItem from "./QuestionListItem";

// This is placeholder data. In the future, this will be fetched from the API.
const mockQuestions: Question[] = [
  {
    id: "1",
    eventId: "1",
    type: "text",
    title: "What is the capital of France?",
    content: "",
    expectedAnswer: "Paris",
    aiThreshold: 0,
    hintEnabled: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    eventId: "1",
    type: "multiple_choice",
    title: "Which of these are fruits?",
    content: "",
    options: { a: "Apple", b: "Carrot", c: "Banana" },
    expectedAnswer: "a,c",
    aiThreshold: 0,
    hintEnabled: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    eventId: "1",
    type: "image",
    title: "Upload a picture of a cat",
    content: "",
    expectedAnswer: null,
    aiThreshold: 0,
    hintEnabled: false,
    createdAt: new Date().toISOString(),
  },
];

const QuestionList: FC = () => {
  // In a real implementation, you would use a hook like SWR or React Query to fetch data.
  const questions = mockQuestions;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Existing Questions</h2>
      {questions.length > 0 ? (
        questions.map((question) => (
          <QuestionListItem key={question.id} question={question} />
        ))
      ) : (
        <p>No questions found.</p>
      )}
    </div>
  );
};

export default QuestionList;
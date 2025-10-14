"use client";

import { FC } from "react";
import { Question } from "@/types/question";
import { QuestionType } from "@/types/question";

// This is placeholder data. In the future, this will be fetched from the API.
const mockQuestions: Question[] = [
  {
    id: "1",
    eventId: "1",
    type: QuestionType.TEXT,
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
    type: QuestionType.MULTIPLE_CHOICE,
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
    type: QuestionType.IMAGE,
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

  const handleEditQuestion = (question: Question) => {
    console.log("Editing question:", question);
    // Placeholder for edit functionality
  };

  const handleDeleteQuestion = (question: Question) => {
    console.log("Deleting question:", question);
    // Placeholder for delete functionality
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Existing Questions</h2>
      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Expected Answer</th>
              <th>AI Threshold</th>
              <th>Hint Enabled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => (
              <tr key={question.id}>
                <td>{question.title}</td>
                <td>
                  <span className={`badge badge-${question.type === QuestionType.TEXT ? 'primary' : question.type === QuestionType.MULTIPLE_CHOICE ? 'secondary' : 'accent'}`}>
                    {question.type.replace('_', ' ')}
                  </span>
                </td>
                <td className="max-w-xs truncate">
                  {question.expectedAnswer || 'N/A'}
                </td>
                <td>{question.aiThreshold}</td>
                <td>
                  <span className={`badge ${question.hintEnabled ? 'badge-success' : 'badge-neutral'}`}>
                    {question.hintEnabled ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  <div className="join">
                    <button
                      className="btn btn-sm btn-warning join-item"
                      onClick={() => handleEditQuestion(question)}
                      aria-label={`Edit ${question.title}`}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-error join-item"
                      onClick={() => handleDeleteQuestion(question)}
                      aria-label={`Delete ${question.title}`}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {questions.length === 0 && (
        <p className="text-center p-4">No questions found.</p>
      )}
    </div>
  );
};

export default QuestionList;

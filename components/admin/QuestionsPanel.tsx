import React from 'react';
import { Question } from '@/types/question';

interface QuestionsPanelProps {
  questions: Question[];
}

const QuestionsPanel: React.FC<QuestionsPanelProps> = ({ questions }) => {
  return (
    <div className="p-4 border rounded-lg mt-4">
      <h2 className="text-2xl font-bold">Questions</h2>
      <ul>
        {questions.map((question) => (
          <li key={question.id}>{question.title}</li>
        ))}
      </ul>
    </div>
  );
};

export default QuestionsPanel;
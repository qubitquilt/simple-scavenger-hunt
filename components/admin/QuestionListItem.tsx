"use client";

import { FC } from "react";
import { Question } from "@/types/question";

interface QuestionListItemProps {
  question: Question;
}

const QuestionListItem: FC<QuestionListItemProps> = ({ question }) => {
  const handleEdit = () => {
    console.log("Editing question:", question.id);
  };

  const handleDelete = () => {
    console.log("Deleting question:", question.id);
  };

  return (
    <div className="card bg-base-100 shadow-xl mb-4">
      <div className="card-body">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="card-title">{question.title}</h2>
            <p className="text-sm text-gray-500">
              Type: <span className="badge badge-ghost">{question.type}</span>
            </p>
          </div>
          <div className="card-actions">
            <button onClick={handleEdit} className="btn btn-sm btn-outline">
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="btn btn-sm btn-outline btn-error"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionListItem;
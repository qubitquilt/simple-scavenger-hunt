"use client";

import React from "react";
import Link from "next/link";
import type { Question } from "@/types/question";
import type { AnswerStatus } from "@/types/answer";

export interface QuestionWithStatus extends Question {
  slug: string;
  userAnswer?: string | null;
  computedStatus?: AnswerStatus | null;
}

interface QuestionCardProps {
  question: QuestionWithStatus;
  onSelect?: () => void;
}

export default function QuestionCard({
  question,
  onSelect,
}: QuestionCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.();
    }
  };

  const effectiveTitle = question.title || question.content;
  const contentPreview = question.title && question.content
    ? question.content.length > 100
      ? `${question.content.substring(0, 100)}...`
      : question.content
    : null;

  const cardContent = (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow min-h-[120px] sm:min-h-[140px]">
      <div className="card-body p-4">
        <h2 className="card-title text-base sm:text-lg leading-tight">
          {effectiveTitle}
        </h2>
        {contentPreview && (
          <p className="text-sm text-base-content/70 mt-2">{contentPreview}</p>
        )}
      </div>
    </div>
  );

  if (onSelect) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label={`Select ${question.content}`}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      href={`/challenges/${question.slug}`}
      className="block focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label={`View ${question.content}`}
    >
      {cardContent}
    </Link>
  );
}

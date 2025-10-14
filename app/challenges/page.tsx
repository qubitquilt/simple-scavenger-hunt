"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserId } from "@/utils/session";
import type { Question } from "@/types/question";
import { QuestionType } from "@/types/question";
import LoadingSpinner from "@/components/LoadingSpinner";
import QuestionCard from "@/components/QuestionCard";

interface QuestionWithStatus {
  id: string;
  slug: string;
  type: QuestionType;
  title: string;
  content: string;
  answered?: boolean;
  status?: "pending" | "correct" | "incorrect";
  eventId: string;
  expectedAnswer: string | null;
  aiThreshold: number;
  hintEnabled: boolean;
  createdAt: string;
}

interface ProgressResponse {
  progress: {
    completed: boolean;
  };
  questions: QuestionWithStatus[];
  stats: {
    completedCount: number;
    totalCount: number;
  };
}

export default function ChallengesPage() {
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const userId = getUserId();

  useEffect(() => {
    if (!userId) {
      router.push("/register");
      return;
    }

    const fetchProgress = async () => {
      try {
        const response = await fetch("/api/progress");
        if (!response.ok) {
          throw new Error("Failed to fetch progress");
        }
        const result: ProgressResponse = await response.json();
        // Removed excessive logging - only log in development
        if (process.env.NODE_ENV === "development") {
          console.log("Fetched progress data:", result);
        }
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [userId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-base-200">
        <LoadingSpinner size="lg" />
        <div className="sr-only">Loading challenges...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center bg-base-200">
        <div className="text-red-600 text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary mt-4 btn-block"
            aria-label="Retry loading challenges"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center bg-base-200">
        <div className="text-gray-600">No challenges available</div>
      </div>
    );
  }

  if (data?.progress?.completed) {
    router.push("/complete");
    return null;
  }

  const { questions, stats } = data;
  const progressPercentage =
    stats.totalCount > 0 ? (stats.completedCount / stats.totalCount) * 100 : 0;

  return (
    <div className="bg-base-200">
      <div className="max-w-2xl mx-auto">
        <div className="p-4 bg-base-100 rounded-lg shadow-md mb-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold">Your Progress</h2>
            <div className="text-lg font-bold">{`${stats.completedCount} of ${stats.totalCount}`}</div>
          </div>
          <progress
            className="progress progress-primary w-full"
            value={progressPercentage}
            max="100"
          ></progress>
        </div>

        <div className="space-y-4">
          {questions.map((question) => (
            <Link
              key={question.id}
              href={`/challenges/${question.slug}`}
              className="block focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`Challenge: ${question.content.substring(0, 50)}... ${question.status || (question.answered ? "pending" : "Not started")}`}
            >
              <QuestionCard question={question} />
            </Link>
          ))}
        </div>

        {stats.totalCount === 0 && (
          <div className="text-center text-gray-500 mt-8">
            No challenges available at this time.
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Question } from "@/types/question";
import type { Event } from "@/types/admin";
import type { Answer } from "@/types/answer";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageQuestion from "@/components/ImageQuestion";

interface ChallengeViewProps {
  question: Question;
  event: Event;
}

type TextFormData = {
  textAnswer: string;
};

type McFormData = {
  mcAnswer: string;
};

const textSchema = z.object({
  textAnswer: z.string().min(1, "Answer is required"),
});

const mcSchema = z.object({
  mcAnswer: z.string().min(1, "Please select an option"),
});

export default function ChallengeView({ question, event }: ChallengeViewProps) {
  const router = useRouter();
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [lastImageUrl, setLastImageUrl] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [maxHints, setMaxHints] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAnswered = !!answer;
  const isCorrect = answer?.status === "correct";
  const isIncorrect = answer?.status === "incorrect";
  const isPending = answer?.status === "pending";
  const shouldShowForm = !isAnswered || isIncorrect;
  const showReadOnly = isAnswered && (isCorrect || isPending);

  // Separate forms for different types
  const textForm = useForm<TextFormData>({
    resolver: zodResolver(textSchema),
    defaultValues: {
      textAnswer: "",
    },
  });

  const mcForm = useForm<McFormData>({
    resolver: zodResolver(mcSchema),
    defaultValues: {
      mcAnswer: "",
    },
  });

  // Set initial values for pre-fill on incorrect
  useEffect(() => {
    if (isIncorrect && answer) {
      if (question.type === "text") {
        textForm.setValue("textAnswer", answer.submission as string, { shouldValidate: false });
      } else if (question.type === "multiple_choice") {
        mcForm.setValue("mcAnswer", answer.submission as string, { shouldValidate: false });
      }
    }
  }, [answer, isIncorrect, question.type, textForm, mcForm, question]);

  const fetchAnswer = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/answers?questionId=${question.id}`, {
        credentials: "include",
      });
  
      if (process.env.NODE_ENV === 'development') {
        console.log('ChallengeView fetchAnswer - response status:', response.status)
      }
  
      if (!response.ok) {
        if (response.status === 401) {
          if (process.env.NODE_ENV === 'development') {
            console.log('ChallengeView - 401 from /api/answers, redirecting to register')
          }
          router.push("/register");
          return;
        }
        setError("Failed to load answer status");
        setLoading(false);
        return;
      }
  
      const responseData = await response.json();
      const { answer: answerData } = responseData;
      setAnswer(answerData);
  
      if (answerData) {
        if (question.type === "image") {
          const imageUrl = (answerData.submission as { url: string }).url;
          setLastImageUrl(imageUrl);
        }
      }
    } catch (err) {
      setError("Failed to load answer status");
    } finally {
      setLoading(false);
    }
  }, [question.id, question.type, router]);

  useEffect(() => {
    fetchAnswer();
  }, [question.id, router, fetchAnswer]);

  const handleTextSubmit = async (data: TextFormData) => {
    await handleSubmitGeneric(data.textAnswer);
  };

  const handleMcSubmit = async (data: McFormData) => {
    await handleSubmitGeneric(data.mcAnswer);
  };

  const handleSubmitGeneric = async (submission: string) => {
    setSubmitting(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/answers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          questionId: question.id,
          submission,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 409 || response.status === 401) {
          setFeedback("Already submitted or please log in");
        } else {
          setError(errData.error || "Submission failed");
        }
        return;
      }

      const result = await response.json();

      if (result.accepted) {
        router.push("/challenges");
        return;
      }

      let feedbackMessage = "Incorrect. Please try again.";
      if (question.type === "text") {
        const score = result.aiScore || 0;
        const threshold = question.aiThreshold || 10;
        const distance = threshold - score;
        if (distance <= 1) {
          feedbackMessage = "Very close to passing! Try again!";
        } else if (score < 2.5) {
          feedbackMessage = "Not close at all. Try again!";
        } else if (score < 5) {
          feedbackMessage = "Somewhat close. Try again!";
        } else if (score < 7.5) {
          feedbackMessage = "Getting close. Try again!";
        } else {
          feedbackMessage = "Very close. Try again!";
        }
      }
      setFeedback(feedbackMessage);

      // Refetch to update status
      await fetchAnswer();
    } catch (err) {
      setError("Submission error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageAnswer = async (url: string) => {
    setSubmitting(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/answers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          questionId: question.id,
          submission: { url },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || "Image submission failed");
        return;
      }

      const result = await response.json();

      if (result.accepted) {
        router.push("/challenges");
        return;
      }

      setFeedback("Incorrect. Please try again.");

      // Refetch to update status
      await fetchAnswer();
    } catch (err) {
      setError("Image submission error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleHintRequest = async () => {
    if (hintLoading || hintCount >= maxHints || isAnswered) {
      return;
    }

    setHintLoading(true);
    setHint(null);
    setError(null);

    try {
      const response = await fetch("/api/hints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ questionId: question.id }),
      });

      if (!response.ok) {
        setError("Failed to get hint");
        return;
      }

      const result = await response.json();
      setHint(result.hint);
      setHintCount(result.hintCount);
      setMaxHints(result.maxHints);
    } catch (err) {
      setError("Hint request failed");
    } finally {
      setHintLoading(false);
    }
  };

  const handleHintKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleHintRequest();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-200">
        <LoadingSpinner size="lg" />
        <div className="sr-only">Loading challenge...</div>
      </div>
    );
  }

  const renderReadOnlyAnswer = () => {
    if (!showReadOnly) return null;

    let answerContent;
    const userAnswerValue = answer?.submission;

    // Extract the display value from submission, handling both string and object formats
    const getDisplayValue = (submission: any) => {
      if (typeof submission === 'string') {
        return submission;
      }
      if (typeof submission === 'object' && submission !== null) {
        // For text/multiple choice, the answer might be stored under different keys
        return submission.answer || submission.textAnswer || submission.mcAnswer || JSON.stringify(submission);
      }
      return String(submission || '');
    };

    if (question.type === "text") {
      answerContent = (
        <div className="bg-base-200 p-3 rounded-box whitespace-pre-wrap" aria-label="Submitted text answer">
          {getDisplayValue(userAnswerValue)}
        </div>
      );
    } else if (question.type === "multiple_choice") {
      answerContent = (
        <div className="bg-base-200 p-3 rounded-box whitespace-pre-wrap" aria-label="Submitted multiple choice answer">
          {getDisplayValue(userAnswerValue)}
        </div>
      );
    } else if (question.type === "image") {
      const imageUrl = (userAnswerValue as { url: string })?.url;
      answerContent = (
        <div className="flex justify-center">
          <Image
            src={imageUrl}
            alt="Submitted image answer"
            width={400}
            height={300}
            className="max-w-md h-auto rounded-box"
          />
        </div>
      );
    }

    const statusClass = isCorrect
      ? "badge badge-success"
      : "badge badge-warning";
    const statusText = isCorrect ? "Correct" : "Under review";

    return (
      <div className="p-4 bg-base-200 rounded-box">
        <div className="flex justify-between items-center mb-3">
          <span className="text-lg font-medium">Your submission:</span>
          <span className={statusClass} aria-label={`Status: ${statusText}`}>
            {statusText}
          </span>
        </div>
        {answerContent}
      </div>
    );
  };

  const renderForm = () => {
    if (question.type === "image") {
      return (
        <div>
          {isIncorrect && lastImageUrl && (
            <div className="mb-4 p-4 bg-base-200 rounded-box">
              <p className="text-sm font-medium mb-2 text-base-content">Previous attempt:</p>
              <Image
                src={lastImageUrl}
                alt="Previous image submission"
                width={400}
                height={300}
                className="max-w-md h-auto rounded-box"
              />
            </div>
          )}
          <ImageQuestion question={question} progress={null} onAnswer={handleImageAnswer} />
        </div>
      );
    }

    if (question.type === "text") {
      return (
        <form onSubmit={textForm.handleSubmit(handleTextSubmit)} className="space-y-4">
          <div className="form-control w-full max-w-md">
            <label className="label">
              <span className="label-text">Your answer</span>
            </label>
            <textarea
              {...textForm.register("textAnswer")}
              className="textarea textarea-bordered w-full"
              placeholder="Enter your answer here"
              aria-describedby={textForm.formState.errors.textAnswer ? "text-error" : undefined}
            />
            {textForm.formState.errors.textAnswer && (
              <label className="label">
                <span className="label-text-alt text-error">{textForm.formState.errors.textAnswer.message}</span>
              </label>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full max-w-md"
            aria-label="Submit text answer"
          >
            {submitting ? <LoadingSpinner size="sm" /> : "Submit Answer"}
          </button>
        </form>
      );
    }

    if (question.type === "multiple_choice") {
      const options = typeof question.options === 'string' ? (JSON.parse(question.options) as Record<string, string>) : (question.options || {});
      return (
        <form onSubmit={mcForm.handleSubmit(handleMcSubmit)} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Select your answer</span>
            </label>
            <div className="space-y-2">
              {Object.entries(options).map(([key, value]) => (
                <label key={key} className="label btn-block cursor-pointer justify-start gap-2 p-4 hover:bg-base-200 rounded">
                  <input
                    type="radio"
                    name="mcAnswer"
                    value={value}
                    className="radio radio-primary"
                  />
                  <span className="label-text">{value}</span>
                </label>
              ))}
            </div>
            {mcForm.formState.errors.mcAnswer && (
              <label className="label">
                <span className="label-text-alt text-error">{mcForm.formState.errors.mcAnswer.message}</span>
              </label>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full max-w-md"
            aria-label="Submit multiple choice answer"
          >
            {submitting ? <LoadingSpinner size="sm" /> : "Submit Answer"}
          </button>
        </form>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-base-200" role="main" aria-label="Challenge view">
      <div className="max-w-2xl mx-auto">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-6">
            <h1 className="card-title text-2xl mb-4">{question.title}</h1>
            <h3 className="text-l mb-4">{question.content}</h3>
            {renderReadOnlyAnswer()}
            {shouldShowForm && renderForm()}
            {question.hintEnabled && !isAnswered && hintCount < maxHints && (
              <div className="mt-4">
                <button
                  onClick={handleHintRequest}
                  onKeyDown={handleHintKeyDown}
                  disabled={hintLoading}
                  className="btn btn-outline w-full max-w-md"
                  aria-label="Request a hint for this challenge"
                  tabIndex={0}
                >
                  {hintLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Getting hint...</span>
                    </>
                  ) : (
                    `Get Hint (${hintCount + 1}/${maxHints})`
                  )}
                </button>
              </div>
            )}
            {hint && (
              <div className="alert alert-info mt-4" role="alert" aria-label="Hint provided">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="stroke-current shrink-0 w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{typeof hint === 'string' ? hint : JSON.stringify(hint)}</span>
              </div>
            )}
            {error && (
              <div className="alert alert-error mt-4" role="alert" aria-live="assertive">
                {error}
              </div>
            )}
            {feedback && (
              <div
                id="feedback-announce"
                className="alert alert-warning mt-4"
                role="status"
                aria-live="polite"
              >
                {feedback}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
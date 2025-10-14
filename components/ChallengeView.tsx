
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Question } from "@/types/question";
import type { Event } from "@/types/admin";
import type { Answer } from "@/types/answer";
import { AnswerStatus } from "@/types/answer";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageQuestion from "@/components/ImageQuestion";

interface ChallengeViewProps {
  question: Question;
  event: Event;
}

export default function ChallengeView({ question, event }: ChallengeViewProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<string>("");
  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);
  const [hintCount, setHintCount] = useState(0);
  const [maxHints, setMaxHints] = useState(2);

  const isAnswered = !!answer;
  const isCorrect = answer?.status === "correct";
  const isIncorrect = answer?.status === "incorrect";
  const isPending = answer?.status === "pending";
  const userAnswer = answer?.submission as string | { url: string } | undefined;

  useEffect(() => {
    console.log(
      "ChallengeView useEffect triggered - session status:",
      status,
      "session data:",
      !!session,
    );
    console.log("ChallengeView - Current loading state:", loading);
    console.log("ChallengeView - Question ID:", question.id);
    console.log("ChallengeView - isAnswered:", isAnswered);
    console.log(
      "ChallengeView - Session object details:",
      session ? { user: session.user, expires: session.expires } : "null",
    );

    if (status === "loading") {
      console.log(
        "ChallengeView - Session still loading, keeping loading true",
      );
      return;
    }

    if (status === "unauthenticated") {
      console.log(
        "ChallengeView - User unauthenticated, setting loading false and showing login prompt",
      );
      setLoading(false);
      return;
    }

    if (status === "authenticated") {
      console.log(
        "ChallengeView - Session authenticated, proceeding with answer fetch",
      );

      const fetchAnswer = async () => {
        try {
          console.log(
            "ChallengeView - Starting answer fetch for questionId:",
            question.id,
          );
          setLoading(true);
          console.log("ChallengeView - Set loading to true");

          const apiUrl = `/api/answers?questionId=${question.id}`;
          console.log("ChallengeView - Fetching from URL:", apiUrl);

          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const response = await fetch(apiUrl, {
            signal: controller.signal,
            headers: {
              "Cache-Control": "no-cache",
            },
            credentials: "include",
          });
          clearTimeout(timeoutId);

          console.log(
            "ChallengeView - Fetch response status:",
            response.status,
            response.statusText,
          );

          if (response.ok) {
            const responseData = await response.json();
            console.log("ChallengeView - Response data:", responseData);
            const { answer: answerData } = responseData;
            console.log("ChallengeView - Extracted answer data:", answerData);
            setAnswer(answerData);
            if (answerData?.submission && !isAnswered) {
              console.log(
                "ChallengeView - Setting submission from existing answer:",
                answerData.submission,
              );
              setSubmission(typeof answerData.submission === "string" ? answerData.submission : answerData.submission.url);
            }
          } else {
            console.log(
              "ChallengeView - Answer fetch failed with status:",
              response.status,
            );
            const errorText = await response.text();
            console.log("ChallengeView - Error response body:", errorText);
            if (response.status === 401) {
              setError("Please log in to view or submit answers.");
            } else {
              setError(`Failed to load answer: ${response.status}`);
            }
          }
        } catch (err) {
          console.error("ChallengeView - Failed to load answer status:", err);
          if (err instanceof Error && err.name === "AbortError") {
            setError("Request timed out - please check your connection");
          } else {
            setError("Failed to load answer status");
          }
        } finally {
          console.log(
            "ChallengeView - Setting loading to false in finally block",
          );
          setLoading(false);
        }
      };

      fetchAnswer();

      const handleFocus = () => {
        console.log("ChallengeView - Window focus event, refetching answer");
        fetchAnswer();
      };

      window.addEventListener("focus", handleFocus);
      return () => window.removeEventListener("focus", handleFocus);
    } else {
      console.log("ChallengeView - Unexpected session status:", status);
      // Handle unexpected status by setting loading to false
      setLoading(false);
    }
  }, [question.id, session, status]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubmission(e.target.value);
    if (feedback) setFeedback(null);
  };

  const handleMcChange = (value: string) => {
    setSubmission(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission || submitting || isAnswered) {
      if (isAnswered) {
        setFeedback("Already submitted - cannot resubmit");
      }
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ questionId: question.id, submission }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 409 || response.status === 401) {
          setFeedback("Already submitted - cannot resubmit");
        } else {
          throw new Error(errData.error || "Submission failed");
        }
      } else {
        const result = await response.json();

        if (result.accepted) {
          router.push("/challenges");
          return;
        } else {
          setAiScore(result.aiScore || 0);
          setFeedback(
            question.type === "text"
              ? `Score: ${result.aiScore || 0}/${question.aiThreshold}. Try again!`
              : "Incorrect. Please try again.",
          );
          if (question.type !== "multiple_choice") {
            setSubmission("");
          }

          const announcement = document.getElementById("feedback-announce");
          if (announcement) {
            announcement.textContent = feedback;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleHintRequest = async () => {
    if (!question || hintLoading || hintCount >= maxHints || isAnswered) return;

    setHintLoading(true);
    setHintError(null);

    try {
      const response = await fetch("/api/hints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ questionId: question.id }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to get hint");
      }

      const result = await response.json();
      setHint(result.hint);
      setHintCount(result.hintCount);
      setMaxHints(result.maxHints);
    } catch (err) {
      setHintError(err instanceof Error ? err.message : "Hint error");
    } finally {
      setHintLoading(false);
    }
  };

  const handleHintKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleHintRequest();
    }
  };

  const handleImageAnswer = async (url: string) => {
    if (submitting || isAnswered) {
      if (isAnswered) {
        setFeedback("Already submitted - cannot resubmit");
      }
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ questionId: question.id, submission: url }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 409 || response.status === 401) {
          setFeedback("Already submitted - cannot resubmit");
        } else {
          throw new Error(errData.error || "Image submission failed");
        }
      } else {
        const result = await response.json();

        if (result.accepted) {
          router.push("/challenges");
          return;
        } else {
          setAiScore(result.aiScore || 0);
          setFeedback(
            question.type === "text"
              ? `Score: ${result.aiScore || 0}/${question.aiThreshold}. Try again!`
              : "Incorrect. Please try again.",
          );
          if (question.type !== "multiple_choice") {
            setSubmission("");
          }

          const announcement = document.getElementById("feedback-announce");
          if (announcement) {
            announcement.textContent = feedback;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image submission error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const renderReadOnlyAnswer = () => {
    if (!isAnswered) return null;

    let answerContent;
    if (question.type === "text") {
      answerContent = (
        <div className="input bg-base-200 text-base-content p-2" id="answer-desc">
          {typeof userAnswer === 'string' ? userAnswer : ''}
        </div>
      );
    } else if (question.type === "multiple_choice") {
      const options = JSON.parse(question.options as unknown as string);
      const selectedOption = userAnswer as string;
      answerContent = (
        <div className="input bg-base-200 text-base-content p-2">
          {selectedOption}
        </div>
      );
    } else if (question.type === "image") {
      const imageUrl = (userAnswer as { url: string }).url;
      answerContent = (
        <div className="flex justify-center">
          <img
            src={imageUrl}
            alt="Submitted answer"
            className="max-w-full h-auto rounded-box bg-base-200 p-2"
          />
        </div>
      );
    }

    const statusBadge = isCorrect ? (
      <span className="badge badge-success">Correct</span>
    ) : isIncorrect ? (
      <span className="badge badge-error">Incorrect</span>
    ) : (
      <span className="badge badge-neutral">Submitted</span>
    );

    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Your Answer:</span>
          {statusBadge}
        </div>
        {answerContent}
      </div>
    );
  }}

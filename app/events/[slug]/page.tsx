"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getUserId } from "@/utils/session";
import LoadingSpinner from "@/components/LoadingSpinner";
import EventQuestionsList from "@/components/EventQuestionsList";
import type { Event } from "@/types/admin";

interface ProgressResponse {
  progress: {
    completed: boolean;
  };
  questions: any[];
  stats: {
    completedCount: number;
    totalCount: number;
  };
}

export default function EventPage({ params }: { params: { slug: string } }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [progressData, setProgressData] = useState<ProgressResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();
  const userId = getUserId();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch event data
        const eventResponse = await fetch(`/api/events?slug=${params.slug}`);
        if (!eventResponse.ok) {
          throw new Error("Event not found");
        }
        const eventData = await eventResponse.json();
        setEvent(eventData);

        // Fetch progress data if authenticated
        if (userId) {
          const progressResponse = await fetch(
            `/api/progress?eventId=${eventData.id}`,
          );
          if (progressResponse.ok) {
            const progressResult = await progressResponse.json();
            setProgressData(progressResult);

            // Check if event is completed
            if (
              progressResult.progress?.completed ||
              progressResult.questions.every(
                (q: any) => q.computedStatus === "accepted",
              )
            ) {
              router.push("/complete");
              return;
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (status !== "loading") {
      fetchData();
    }
  }, [params.slug, userId, status, router]);

  // Redirect to register if not authenticated
  useEffect(() => {
    if (status === "unauthenticated" && !loading) {
      router.push(`/register?event=${params.slug}`);
    }
  }, [status, loading, params.slug, router]);

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center bg-base-200">
        <LoadingSpinner size="lg" />
        <div className="sr-only">Loading event...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center bg-base-200">
        <div className="text-red-600 text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center bg-base-200">
        <div className="text-gray-600">Event not found</div>
      </div>
    );
  }

  return (
    <div className="bg-base-200 p-4">
      <div className="max-w-7xl mx-auto">
        <EventQuestionsList event={event} progressData={progressData} />
      </div>
    </div>
  );
}

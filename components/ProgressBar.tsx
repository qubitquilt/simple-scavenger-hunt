"use client";

import { useProgress } from "@/lib/useProgress";

export default function ProgressBar() {
  const { stats, loading } = useProgress();

  if (loading || !stats || stats.totalCount === 0) {
    return null;
  }

  const progressPercentage = Math.round(
    (stats.completedCount / stats.totalCount) * 100,
  );

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="flex justify-between text-sm font-medium mb-2">
        <span>Progress</span>
        <span
          aria-label={`Completed ${stats.completedCount} out of ${stats.totalCount} questions`}
        >
          {stats.completedCount} of {stats.totalCount}
        </span>
      </div>
      <progress
        className="progress w-full progress-success"
        value={progressPercentage}
        max="100"
        role="progressbar"
        aria-valuenow={stats.completedCount}
        aria-valuemax={stats.totalCount}
        aria-label="Scavenger hunt progress"
      />
    </div>
  );
}

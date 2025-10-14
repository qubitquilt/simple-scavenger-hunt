"use client";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function LoadingSpinner({}: LoadingSpinnerProps) {
  return <span className="loading loading-spinner loading-xl"></span>;
}

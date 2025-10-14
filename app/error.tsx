"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center bg-base-200 p-4">
      <div className="max-w-md w-full bg-base-50 rounded-lg shadow-md p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <div role="alert" className="alert alert-error alert-soft">
          {typeof error.message === "string"
            ? error.message
            : JSON.stringify(error.message)}
        </div>
        <button
          onClick={reset}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          aria-label="Try again"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

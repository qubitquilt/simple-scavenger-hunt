"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface FormData {
  name: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormData>({ name: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  useEffect(() => {
    // Check if user is already authenticated
    const userId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("userId="))
      ?.split("=")[1];
    if (userId) {
      console.log("User already authenticated with userId:", userId);
      // If we have an eventId, redirect to event-specific challenges
      // Otherwise, redirect to generic challenges (fallback)
      const redirectPath = eventId ? `/events/${eventId}` : "/challenges";
      router.push(redirectPath);
      return;
    }
    console.log("No existing user session found");
  }, [router, eventId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          eventId: eventId, // Pass eventId to registration API
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Registration failed");
      }

      const data = await response.json();
      // Redirect to event-specific challenges page instead of generic challenges
      const redirectPath = eventId ? `/events/${eventId}` : "/challenges";
      router.push(redirectPath);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 flex flex-col items-center justify-center p-4 bg-base-200 mt-50">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="fieldset">
            <legend className="fieldset-legend pb-4">What is your name?</legend>
            <input
              type="text"
              id="name"
              data-testid="registration-form-name-input"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Type here"
              className="input"
              aria-describedby="name-error"
            />
          </fieldset>
          {error && (
            <div role="alert" className="alert alert-error alert-soft">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 shrink-0 stroke-current"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-block"
            aria-label="Register and start the scavenger hunt"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";

export default function LandingPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.admin;

  return (
    <div className="bg-base-200 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Simple Scavenger Hunt</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A fun and engaging scavenger hunt application designed to test your
            skills and creativity.
          </p>
        </header>

        <section className="mb-12">
          <h2 className="text-3xl font-semibold mb-6">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-base-50 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-medium mb-3">1. Register</h3>
              <p className="text-gray-600">
                Sign up to participate in the scavenger hunt.
              </p>
            </div>
            <div className="bg-base-50 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-medium mb-3">2. Scan QR Codes</h3>
              <p className="text-gray-600">
                Find and scan QR codes at various locations.
              </p>
            </div>
            <div className="bg-base-50 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-medium mb-3">3. Visit Event URLs</h3>
              <p className="text-gray-600">
                Access event-specific pages via provided URLs.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-semibold mb-6">
            Instructions for Participants
          </h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2 max-w-2xl mx-auto">
            <li>Register with your details to start participating.</li>
            <li>Use your device to scan QR codes found at event locations.</li>
            <li>
              Visit the URLs provided for each event to access challenges.
            </li>
            <li>Answer questions and complete tasks to progress.</li>
            <li>Track your progress and aim for completion!</li>
          </ul>
        </section>

        {isAdmin && (
          <div className="text-center">
            <a
              href="/admin"
              className="btn btn-primary"
              aria-label="Go to admin panel"
            >
              Admin Panel
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

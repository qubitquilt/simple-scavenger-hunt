"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import type { AdminSession } from "@/types/admin";

interface LoginFormData {
  username: string;
  password: string;
}

export default function AdminLogin() {
  const [formData, setFormData] = useState<LoginFormData>({
    username: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      username: formData.username,
      password: formData.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid username or password");
    } else if (result?.ok) {
      router.push("/admin");
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center bg-base-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <fieldset className="fieldset bg-base-200 border-base-300 rounded-box max-w-md border p-4">
          <legend className="fieldset-legend">
            <span className="label-text">Admin Login</span>
          </legend>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="form-control w-full">
              <label className="label" htmlFor="username">
                <span className="label-text">Username</span>
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="input input-bordered w-full"
                placeholder="Username"
                value={formData.username}
                onChange={handleInputChange}
                disabled={loading}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>
            <div className="form-control w-full">
              <label className="label" htmlFor="password">
                <span className="label-text">Password</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input input-bordered w-full"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={loading}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>

            {error && (
              <div
                id="login-error"
                className="alert alert-error mt-4"
                role="alert"
                aria-live="assertive"
              >
                <span>{error}</span>
              </div>
            )}

            <div className="form-control w-full">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-neutral w-full mt-4"
                aria-label="Sign in to admin panel"
                aria-describedby={error ? "login-error" : undefined}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </div>
          </form>
        </fieldset>
      </div>
    </div>
  );
}

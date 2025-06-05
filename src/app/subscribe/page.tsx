"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/stores";

export default function SubscribePage() {
  const userData = useStore((state) => state.userData);
  const setEmail = useStore((state) => state.setEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    const email = formData.get("email") as string;
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        body: JSON.stringify({
          email,
          name: userData?.name
        })
      });

      if (!response.ok) {
        throw new Error("Failed to capture email");
      }

      setEmail(email);
      // Redirect to main page
      router.push("/summaries");
    } catch (error) {
      console.error("Error capturing email:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col justify-center items-center p-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-base-content mb-2">
            Get Personalized Insights
          </h1>
          <p className="text-base-content/70">
            Enter your email to unlock your relationship insights.
          </p>
        </div>

        {/* Form */}
        <form action={handleSubmit} className="space-y-6">
          <div>
            <input
              type="email"
              name="email"
              defaultValue={userData?.email || ""}
              required
              pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
              placeholder="your@email.com"
              className={`input input-lg w-full bg-white text-black border-2 ${
                error ? "border-error" : "border-base-300 focus:border-primary"
              }`}
              disabled={isSubmitting}
            />
            {error && <p className="text-error text-sm mt-2">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`btn btn-neutral btn-lg w-full`}
          >
            {isSubmitting ? "Submitting..." : "Continue"}
          </button>
        </form>

        {/* Benefits */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center text-sm text-base-content/70">
            <svg
              className="w-4 h-4 mr-2 text-success"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Track relationship progress
          </div>
          <div className="flex items-center text-sm text-base-content/70">
            <svg
              className="w-4 h-4 mr-2 text-success"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Get personalized insights
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-base-content/50">
            By continuing, you agree to our{" "}
            <a
              href="https://www.relatable.love/website-terms-and-conditions"
              className="link link-primary"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="https://www.relatable.love/website-privacy-policy"
              className="link link-primary"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

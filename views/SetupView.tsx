"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { isValidIdentifier, persistIdentifier } from "@/utils/identifierStorage";

export default function SetupView() {
  const [identifierInput, setIdentifierInput] = useState<string>("");
  const [isMasked, setIsMasked] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Strictly numbers only: filter out any non-digit characters
    const numericOnly = e.target.value.replace(/\D/g, "");
    setIdentifierInput(numericOnly);
    if (feedback) setFeedback(null);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const sanitized = identifierInput.trim();

    if (!sanitized) {
      setFeedback({
        type: "error",
        message: "Please enter an identifier containing only numbers.",
      });
      return;
    }

    if (!isValidIdentifier(sanitized)) {
      setFeedback({
        type: "error",
        message: "The identifier must contain only digits (0-9).",
      });
      return;
    }

    setIsSubmitting(true);
    const success = persistIdentifier(sanitized);
    setIsSubmitting(false);

    if (success) {
      setFeedback({
        type: "success",
        message: "Identifier safely saved. Redirecting to main dashboard...",
      });
    } else {
      setFeedback({
        type: "error",
        message: "Could not write to local storage (storage might be blocked or full).",
      });
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 sm:p-8 space-y-6">
      
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-2 ring-1 ring-blue-500/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Atlas Setup
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Enter your numeric identifier to access your content. It will be stored safely and locally on your browser.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="identifier-input"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300"
          >
            Numeric Identifier
          </label>

          <div className="relative">
            <input
              id="identifier-input"
              type={isMasked ? "password" : "text"}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              placeholder="e.g. 12345678"
              value={identifierInput}
              onChange={handleInputChange}
              className="w-full px-4 py-3.5 pr-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-lg tracking-wider font-mono"
            />

            {identifierInput.length > 0 && (
              <button
                type="button"
                onClick={() => setIsMasked(!isMasked)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition rounded-lg"
                title={isMasked ? "Show identifier" : "Hide identifier"}
                aria-label={isMasked ? "Show identifier" : "Hide identifier"}
              >
                {isMasked ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Digits only (0-9). Letters and special characters are automatically excluded.
          </p>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            role="alert"
            className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
            }`}
          >
            {feedback.type === "success" ? (
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Submit Action */}
        <button
          type="submit"
          disabled={isSubmitting || identifierInput.length === 0}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-semibold text-sm transition shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? "Saving..." : "Continue with Identifier"}
        </button>
      </form>

      {/* Security info */}
      <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 p-3.5 border border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-start gap-2.5">
        <svg
          className="w-4 h-4 shrink-0 text-blue-500 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <p>
          Your identifier is stored strictly inside your navigator&apos;s local memory. It never gets transmitted to external tracking services.
        </p>
      </div>

    </div>
  );
}


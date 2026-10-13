"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import {
  isValidIdentifier,
  persistIdentifier,
  clearStoredIdentifier,
} from "./utils/identifierStorage";
import { useIsHydrated, useStoredIdentifier } from "./hooks/useIdentifier";

export default function Home() {
  const isHydrated = useIsHydrated();
  const storedIdentifier = useStoredIdentifier();

  const [customInput, setCustomInput] = useState<string | null>(null);
  const [isMasked, setIsMasked] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const inputValue = customInput !== null ? customInput : (storedIdentifier ?? "");

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const numericOnly = e.target.value.replace(/\D/g, "");
    setCustomInput(numericOnly);
    if (feedback) setFeedback(null);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const sanitized = inputValue.trim();

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

    const success = persistIdentifier(sanitized);
    if (success) {
      setCustomInput(null);
      setFeedback({
        type: "success",
        message: "Identifier safely saved in your browser's local storage.",
      });
    } else {
      setFeedback({
        type: "error",
        message: "Could not write to local storage (storage might be blocked or full).",
      });
    }
  };

  const handleClear = () => {
    clearStoredIdentifier();
    setCustomInput("");
    setFeedback({
      type: "success",
      message: "Stored identifier has been removed from your browser.",
    });
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200/80 dark:border-zinc-800 p-6 sm:p-8 space-y-6">

        <div className="space-y-2 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
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
          <h1 className="text-2xl font-bold tracking-tight">Identifier Setup</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Enter your numeric identifier. It will be stored safely and locally on your browser.
          </p>
        </div>

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
                placeholder={isHydrated ? "12345678" : "Loading..."}
                value={isHydrated ? inputValue : ""}
                onChange={handleInputChange}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-lg tracking-wider font-mono"
              />
              {inputValue.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsMasked(!isMasked)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition rounded-lg"
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
              Only numbers (0-9) are allowed. Letters and special characters are automatically filtered out.
            </p>
          </div>

          {feedback && (
            <div
              role="alert"
              className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${feedback.type === "success"
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

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 cursor-pointer"
            >
              Save Identifier
            </button>

            {isHydrated && storedIdentifier && (
              <button
                type="button"
                onClick={handleClear}
                className="py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:border-rose-800/60 dark:hover:text-rose-400 text-zinc-600 dark:text-zinc-300 font-semibold text-sm transition cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {isHydrated && (
          <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-4 mt-6">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-medium">Storage Status:</span>
              {storedIdentifier ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Saved ({storedIdentifier.length} digits)
                </span>
              ) : (
                <span className="text-zinc-400 dark:text-zinc-500">No identifier stored</span>
              )}
            </div>

            {storedIdentifier && (
              <div className="mt-3 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] block uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">
                    Stored Value
                  </span>
                  <span className="font-mono text-sm tracking-widest text-zinc-800 dark:text-zinc-200">
                    {isMasked ? "•".repeat(Math.min(storedIdentifier.length, 16)) : storedIdentifier}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMasked(!isMasked)}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium cursor-pointer"
                >
                  {isMasked ? "Reveal" : "Hide"}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/30 p-3 border border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-start gap-2">
          <svg
            className="w-4 h-4 shrink-0 text-zinc-400 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>
            Stored locally on your navigator (<code>localStorage</code>). Data is validated for numeric integrity and never sent to external servers.
          </p>
        </div>

      </div>
    </main>
  );
}
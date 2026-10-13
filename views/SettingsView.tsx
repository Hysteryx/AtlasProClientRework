"use client";

import { useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import ConfirmModal from "@/components/ConfirmModal";

interface SettingsViewProps {
  storedIdentifier: string;
  onRemoveIdentifier: () => void;
}

export default function SettingsView({
  storedIdentifier,
  onRemoveIdentifier,
}: SettingsViewProps) {
  const [isMasked, setIsMasked] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(storedIdentifier);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmRemoval = () => {
    setConfirmModalOpen(false);
    onRemoveIdentifier();
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-rose-500 selection:text-white">
      
      {/* Header bar */}
      <header className="w-full max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition group"
        >
          <svg
            className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Hub
        </Link>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-zinc-400 font-mono">Active Session</span>
        </div>
      </header>

      {/* Main Settings Body */}
      <main className="w-full max-w-2xl mx-auto px-6 py-8 flex-1">
        
        {/* Title */}
        <div className="space-y-2 mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-2">
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Settings</h1>
          <p className="text-sm text-zinc-400">
            Manage your device configuration, stored identifier and security preferences.
          </p>
        </div>

        <div className="space-y-6">
          
          {/* Section 1: Active Identifier */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Stored Identifier</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Saved securely in your browser&apos;s navigator storage.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                Active
              </span>
            </div>

            {/* Display Field */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800/80 flex items-center justify-center text-zinc-400 shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] block uppercase tracking-wider text-zinc-500 font-bold">
                    Device Identifier
                  </span>
                  <span className="font-mono text-lg font-semibold tracking-widest text-zinc-200">
                    {isMasked ? "•".repeat(Math.min(storedIdentifier.length, 16)) : storedIdentifier}
                  </span>
                </div>
              </div>

              {/* Reveal & Copy Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsMasked(!isMasked)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
                >
                  {isMasked ? "Reveal" : "Hide"}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Identifier length: {storedIdentifier.length} digits</span>
            </div>
          </div>

          {/* Section 2: Danger Zone / Remove Identifier */}
          <div className="bg-rose-950/20 border border-rose-900/40 rounded-3xl p-6 sm:p-7 space-y-4">
            <div>
              <h2 className="text-base font-bold text-rose-400">Remove Identifier</h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Removing your identifier will immediately wipe it from your navigator&apos;s local storage and terminate your active session on this device. You will be redirected to the identifier setup screen.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-sm transition shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Remove Identifier from Device
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Extracted Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalOpen}
        title="Are you sure?"
        description="This will delete your identifier locally from this browser. You will need to re-enter your numeric code to access your content."
        confirmText="Yes, Remove Identifier"
        cancelText="Cancel"
        onConfirm={handleConfirmRemoval}
        onCancel={() => setConfirmModalOpen(false)}
      />

      {/* Reusable Footer */}
      <Footer className="max-w-4xl" />
    </div>
  );
}


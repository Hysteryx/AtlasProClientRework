"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

interface HubViewProps {
  identifier: string;
}

export default function HubView({ identifier }: HubViewProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDisabledModuleClick = (moduleName: string) => {
    setToastMessage(`${moduleName} is currently in preview mode and not yet active.`);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const maskedId =
    identifier.length > 4
      ? "•••• " + identifier.slice(-4)
      : "•••• " + identifier;

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      
      {/* Top Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 font-black text-white text-lg tracking-wider">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-xl text-white">ATLAS</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 tracking-wider uppercase">
                Hub
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">Personal Media Client</p>
          </div>
        </div>

        {/* Status / Clock */}
        <div className="flex items-center gap-4">
          {currentTime && (
            <span className="font-mono text-sm text-zinc-400 font-medium hidden sm:inline-block">
              {currentTime}
            </span>
          )}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500 animate-pulse" />
            <span className="font-mono tracking-wider text-zinc-400">{maskedId}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto px-6 py-8 flex-1 flex flex-col justify-center">
        
        {/* Hero Section */}
        <div className="mb-10 text-center sm:text-left space-y-2">
          <h1 className="text-3xl sm:5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Choose your experience
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl">
            Select a category to start watching, or configure your device in the settings menu.
          </p>
        </div>

        {/* 4 Interactive Modern Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* 1. LIVE BUTTON */}
          <button
            type="button"
            onClick={() => handleDisabledModuleClick("Live TV")}
            className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 border border-zinc-800/80 hover:border-rose-500/50 hover:shadow-2xl hover:shadow-rose-500/10 hover:-translate-y-1.5 active:scale-[0.98] transition-all duration-300 text-left cursor-pointer overflow-hidden min-h-[220px]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all duration-500 -mr-10 -mt-10" />

            <div className="flex items-center justify-between w-full z-10">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all duration-300 shadow-md">
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
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                Live
              </span>
            </div>

            <div className="mt-8 z-10">
              <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-rose-400 transition-colors">
                Live
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Stream live channels, real-time broadcasts & events.
              </p>
            </div>
          </button>

          {/* 2. MOVIE BUTTON */}
          <button
            type="button"
            onClick={() => handleDisabledModuleClick("Movie Catalog")}
            className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 border border-zinc-800/80 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1.5 active:scale-[0.98] transition-all duration-300 text-left cursor-pointer overflow-hidden min-h-[220px]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-500 -mr-10 -mt-10" />

            <div className="flex items-center justify-between w-full z-10">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-black transition-all duration-300 shadow-md">
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
                    d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                  />
                </svg>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider">
                VOD
              </span>
            </div>

            <div className="mt-8 z-10">
              <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                Movie
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Discover blockbuster cinema, indie films & on-demand releases.
              </p>
            </div>
          </button>

          {/* 3. SERIES BUTTON */}
          <button
            type="button"
            onClick={() => handleDisabledModuleClick("Series Catalog")}
            className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 border border-zinc-800/80 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1.5 active:scale-[0.98] transition-all duration-300 text-left cursor-pointer overflow-hidden min-h-[220px]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500 -mr-10 -mt-10" />

            <div className="flex items-center justify-between w-full z-10">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 shadow-md">
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
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider">
                Shows
              </span>
            </div>

            <div className="mt-8 z-10">
              <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                Series
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Explore complete seasons, episodes & trending serials.
              </p>
            </div>
          </button>

          {/* 4. SETTINGS BUTTON */}
          <Link
            href="/settings"
            className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 border border-zinc-800/80 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1.5 active:scale-[0.98] transition-all duration-300 text-left overflow-hidden min-h-[220px]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-500 -mr-10 -mt-10" />

            <div className="flex items-center justify-between w-full z-10">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-black transition-all duration-300 shadow-md">
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                Config
                <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>

            <div className="mt-8 z-10">
              <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                Settings
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Manage your device, session and clear your identifier.
              </p>
            </div>
          </Link>

        </div>
      </main>

      {/* Floating Preview Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-5 py-3 rounded-2xl bg-zinc-900/95 text-zinc-200 text-xs font-semibold border border-zinc-700/80 shadow-2xl flex items-center gap-2.5 backdrop-blur-md">
            <svg
              className="w-4 h-4 text-amber-400 shrink-0"
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
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Reusable Footer */}
      <Footer />
    </div>
  );
}


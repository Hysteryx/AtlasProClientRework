"use client";

import { useIsHydrated, useStoredIdentifier } from "@/hooks/useIdentifier";
import SetupView from "@/views/SetupView";
import HubView from "@/views/HubView";
import LoadingScreen from "@/components/LoadingScreen";

export default function Home() {
  const isHydrated = useIsHydrated();
  const storedIdentifier = useStoredIdentifier();

  if (!isHydrated) {
    return <LoadingScreen message="Loading Atlas..." />;
  }

  if (storedIdentifier) {
    return <HubView identifier={storedIdentifier} />;
  }
  
  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-zinc-950 text-zinc-100 transition-colors">
      <SetupView />
    </main>
  );
}
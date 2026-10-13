"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStoredIdentifier, useIsHydrated } from "@/hooks/useIdentifier";
import { clearStoredIdentifier } from "@/utils/identifierStorage";
import SettingsView from "@/views/SettingsView";
import LoadingScreen from "@/components/LoadingScreen";

export default function SettingsPage() {
  const router = useRouter();
  const isHydrated = useIsHydrated();
  const storedIdentifier = useStoredIdentifier();
  const [isRemoving, setIsRemoving] = useState<boolean>(false);

  useEffect(() => {
    if (isHydrated && !storedIdentifier && !isRemoving) {
      router.replace("/");
    }
  }, [isHydrated, storedIdentifier, isRemoving, router]);

  const handleRemoveIdentifier = () => {
    setIsRemoving(true);
    clearStoredIdentifier();
    router.replace("/");
  };

  if (!isHydrated || !storedIdentifier) {
    return <LoadingScreen message="Loading settings..." />;
  }

  return (
    <SettingsView
      storedIdentifier={storedIdentifier}
      onRemoveIdentifier={handleRemoveIdentifier}
    />
  );
}

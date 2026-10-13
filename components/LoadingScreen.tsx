interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Loading Atlas..." }: LoadingScreenProps) {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-zinc-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-wider">{message}</span>
      </div>
    </main>
  );
}


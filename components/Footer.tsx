export default function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={`w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-zinc-600 ${className}`}>
      Atlas Client • Stored locally in browser session
    </footer>
  );
}


interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-lg shadow-rose-600/20 cursor-pointer"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}


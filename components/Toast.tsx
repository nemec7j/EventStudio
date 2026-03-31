"use client";

type ToastProps = {
  open: boolean;
  message: string;
  onClose: () => void;
};

export default function Toast({ open, message, onClose }: ToastProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="animate-[pop_180ms_ease-out] rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30">
        <div className="flex items-center gap-3">
          <span>{message}</span>
          <button
            type="button"
            className="text-white/70 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

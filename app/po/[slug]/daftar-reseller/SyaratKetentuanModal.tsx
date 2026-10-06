"use client";

import { BRAND_NAME } from "@/lib/brand";
import { X, FileText } from "lucide-react";
import { SYARAT_DAN_KETENTUAN } from "@/lib/po/wa-messages";

interface Props {
  open: boolean;
  onClose: () => void;
  onAgree: () => void; // <-- Tambahkan ini
}

export default function SyaratKetentuanModal({
  open,
  onClose,
  onAgree,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm px-0 sm:px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
              <FileText size={16} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-500 dark:text-blue-400">
                Syarat & Ketentuan
              </p>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                {BRAND_NAME}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <ol className="space-y-3">
            {SYARAT_DAN_KETENTUAN.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm text-slate-700 dark:text-slate-300"
              >
                <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                  {i + 1}
                </span>
                <span className="leading-relaxed pt-0.5">{item}</span>
              </li>
            ))}
          </ol>

          <p className="text-sm text-slate-500 dark:text-slate-400 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            Atas perhatiannya kami sampaikan terima kasih.
            <br />
            Tertanda,{" "}
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {BRAND_NAME}
            </span>
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={onAgree} // <-- Ubah onClose menjadi onAgree di sini
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Saya mengerti
          </button>
        </div>
      </div>
    </div>
  );
}

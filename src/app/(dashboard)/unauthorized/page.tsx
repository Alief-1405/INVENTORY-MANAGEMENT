"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="w-full max-w-md border border-rose-200/20 dark:border-rose-950/20 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md p-8 rounded-2xl shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Glowy Shield Icon */}
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30">
          <div className="absolute inset-0 rounded-full bg-rose-500/10 blur-md animate-pulse" />
          <ShieldAlert className="h-10 w-10 text-rose-500 relative z-10" />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-zinc-100">
            Akses Ditolak
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Maaf, Anda tidak memiliki izin yang diperlukan untuk mengakses halaman ini. Halaman ini dibatasi untuk pengguna dengan tingkat akses tertentu.
          </p>
        </div>

        {/* Divider line */}
        <div className="h-px bg-slate-200/80 dark:bg-zinc-800/80 w-full" />

        {/* Actions buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0B132B] hover:bg-[#1C2541] text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Home className="h-4 w-4" />
            Kembali ke Dashboard
          </Link>
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-zinc-850 bg-white/80 dark:bg-zinc-900/80 hover:bg-slate-55 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Halaman Sebelumnya
          </button>
        </div>
      </div>
    </div>
  );
}

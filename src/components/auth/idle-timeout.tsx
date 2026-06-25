"use client";

import { useEffect, useRef } from "react";
import { logoutUser } from "@/app/actions/auth";

interface IdleTimeoutProps {
  timeoutMinutes?: number; // Batas waktu idle dalam menit (default: 15)
}

export function IdleTimeout({ timeoutMinutes = 15 }: IdleTimeoutProps) {
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveRef = useRef<number>(Date.now());

  useEffect(() => {
    // Fungsi logout otomatis saat idle terdeteksi
    const handleLogout = async () => {
      try {
        // 1. Bersihkan penyimpanan lokal client-side
        localStorage.clear();
        sessionStorage.clear();

        // 2. Hapus Cookie Sesi httpOnly secara aman via Server Action
        await logoutUser();

        // 3. Tampilkan pesan pemberitahuan global
        alert("Sesi Anda telah berakhir karena tidak ada aktivitas.");

        // 4. Arahkan pengguna kembali ke halaman login secara paksa
        window.location.href = "/login";
      } catch (error) {
        console.error("Auto logout error:", error);
        window.location.href = "/login";
      }
    };

    // Fungsi mengatur ulang timer idle
    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(handleLogout, timeoutMs);
    };

    // Handler pendeteksi aktivitas
    const handleActivity = () => {
      const now = Date.now();
      
      // OPTIMALISASI (Throttling): Hanya reset timer jika aktivitas berjarak lebih dari 2 detik.
      // Ini mencegah pergerakan mouse ('mousemove') memicu pembuatan ulang timer di setiap piksel
      // yang dapat membebani thread utama peramban (browser).
      if (now - lastActiveRef.current > 2000) {
        lastActiveRef.current = now;
        resetTimer();
      }
    };

    // Inisialisasi awal timer
    resetTimer();

    // Event listener global untuk melacak aktivitas pengguna
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Pembersihan (Cleanup) event listener saat komponen dilepas (unmount)
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [timeoutMs]);

  return null; // Komponen fungsional tanpa visual UI
}

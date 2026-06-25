"use client";

import { useState, useRef } from "react";
import { Sparkles, Image as ImageIcon, X, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface AIScannerProps {
  onDataExtracted: (products: any[]) => void;
}

export default function AIScanner({ onDataExtracted }: AIScannerProps) {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        setImage(file);
        setPreview(URL.createObjectURL(file));
      } else {
        toast.error("Berkas harus berupa gambar (JPEG, PNG, WEBP)!");
      }
    }
  };

  const handleScan = async () => {
    if (!image) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", image);

    try {
      const response = await fetch("/api/products/scan", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const count = result.data?.length || 0;
        toast.success(`AI (${result.provider || "Vision"}) berhasil mengekstrak ${count} produk!`);
        onDataExtracted(result.data || []);
        handleClear();
      } else {
        throw new Error(result.message || "Gagal memindai gambar.");
      }
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan integrasi AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setImage(null);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        Scan Dokumen / Nota via AI Vision
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Upload Button */}
        <div className="md:col-span-1">
          <div
            onClick={() => !loading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition h-52 flex flex-col justify-center items-center gap-3 ${
              loading
                ? "opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-zinc-900/10"
                : "border-slate-300 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 bg-slate-50/50 dark:bg-zinc-900/10"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={loading}
            />
            <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full">
              <Camera className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ambil Foto / Unggah Nota</p>
              <p className="text-xs text-slate-400">Mendukung JPEG, PNG, WEBP</p>
            </div>
          </div>
        </div>

        {/* Preview and Scan action */}
        <div className="md:col-span-2 flex flex-col justify-between border border-slate-200 dark:border-zinc-800 bg-slate-50/20 dark:bg-zinc-950/20 rounded-xl p-4 min-h-[13rem]">
          {preview ? (
            <div className="relative h-32 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview nota" className="h-full object-contain" />
              <button
                onClick={handleClear}
                disabled={loading}
                className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-red-600 text-white rounded-full transition disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="h-32 w-full border border-dashed border-slate-200 dark:border-zinc-900 rounded-lg flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
              <ImageIcon className="h-8 w-8 mb-1.5 stroke-1" />
              <p className="text-xs">Pratinjau gambar akan muncul di sini</p>
            </div>
          )}

          <div className="flex justify-end mt-3">
            <Button
              onClick={handleScan}
              disabled={!image || loading}
              className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menganalisis Nota...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Pindai Gambar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

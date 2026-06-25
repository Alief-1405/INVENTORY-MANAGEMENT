"use client";

import { useState, useRef } from "react";
import { FolderUp, FileSpreadsheet, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ExcelImporterProps {
  onDataImported: (products: any[]) => void;
}

export default function ExcelImporter({ onDataImported }: ExcelImporterProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (uploadedFile: File) => {
    const ext = uploadedFile.name.split(".").pop()?.toLowerCase();
    if (ext === "xlsx" || ext === "xls" || ext === "csv") {
      setFile(uploadedFile);
    } else {
      toast.error("Format berkas tidak valid. Gunakan berkas bertipe .xlsx atau .csv");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`Berhasil memproses berkas Excel! ${result.data?.length || 0} produk siap ditinjau.`);
        onDataImported(result.data || []);
        setFile(null);
      } else {
        throw new Error(result.message || "Gagal mengimpor file.");
      }
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan upload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
        <FileSpreadsheet className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
        Impor Produk via Excel / CSV
      </h3>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 relative ${
          dragActive
            ? "border-blue-500 bg-blue-500/5"
            : "border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-zinc-900/10"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".xlsx, .xls, .csv"
          onChange={handleChange}
        />

        {!file ? (
          <div className="space-y-3">
            <div className="mx-auto w-10 h-10 bg-slate-100 dark:bg-zinc-900 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400">
              <FolderUp className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                Pilih file atau seret file ke area ini
              </p>
              <p className="text-xs text-slate-400">
                Ekstensi yang didukung: .xlsx, .xls, .csv hingga 10MB
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-900 rounded-lg max-w-md mx-auto border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="text-left truncate">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {file.name}
                </p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="text-slate-400 hover:text-red-500 p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-850 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {file && (
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Memproses Data...
              </>
            ) : (
              "Ekstrak Data Excel"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

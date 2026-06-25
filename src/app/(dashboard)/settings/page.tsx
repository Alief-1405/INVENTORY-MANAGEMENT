"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  User, 
  Mail, 
  Shield, 
  Fingerprint, 
  Upload, 
  Loader2, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle 
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// =========================================================================
// DEFINISI TYPE & SCHEMA VALIDASI
// =========================================================================

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

const profileSchema = z.object({
  name: z.string().min(3, "Nama lengkap minimal berisi 3 karakter"),
  email: z.string().email("Format email tidak valid"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State untuk unggah logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // =========================================================================
  // API QUERY (Mengambil data profil user)
  // =========================================================================
  const { data: profile, isLoading: loadingProfile } = useQuery<UserProfile>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Gagal mengambil profil.");
      const json = await res.json();
      return json.data;
    }
  });

  // Setup React Hook Form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: ""
    }
  });

  // Sinkronisasi data form setelah query profil selesai dimuat
  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name,
        email: profile.email
      });
    }
  }, [profile, form]);

  // Mutation untuk Update Profil Pengguna
  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal memperbarui profil.");
      return data;
    },
    onSuccess: (data) => {
      toast.success("Profil berhasil diperbarui!");
      setSuccessMsg("Profil pengguna berhasil diperbarui.");
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      // Reload window agar perubahan nama di Header/Sidebar sinkron via Cookie Session
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal memperbarui profil.");
      setErrorMsg(err.message || "Gagal memperbarui profil.");
      setSuccessMsg(null);
    }
  });

  // =========================================================================
  // LOGIKA HANDLER UNTUK LOGO APLIKASI
  // =========================================================================
  
  // Handler memilih file logo
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Ukuran file terlalu besar. Maksimal 2 MB.");
        setErrorMsg("Ukuran file terlalu besar. Maksimal adalah 2 MB.");
        return;
      }
      setLogoFile(file);
      // Buat local preview URL
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      setErrorMsg(null);
    }
  };

  // Handler Kirim Logo ke Server
  const handleUploadLogo = async () => {
    if (!logoFile) return;
    setUploadingLogo(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append("logo", logoFile);

    try {
      const res = await fetch("/api/settings/logo", {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Terjadi kesalahan saat mengunggah logo.");
      }

      toast.success("Logo aplikasi berhasil diperbarui!");
      setSuccessMsg("Logo aplikasi berhasil diperbarui!");
      setLogoFile(null);
      setLogoPreview(null);
      
      // Mengirimkan notifikasi query ke sidebar untuk memperbarui gambarnya
      queryClient.invalidateQueries({ queryKey: ["app-logo"] });
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah logo.");
      setErrorMsg(err.message || "Gagal mengunggah logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500 font-medium">Memuat pengaturan profil...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">Pengaturan Aplikasi</h1>
        <p className="text-slate-500 text-sm">
          Kelola informasi profil pribadi Anda dan sesuaikan identitas visual aplikasi.
        </p>
      </div>

      {/* Notifikasi Sukses/Gagal */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl animate-fade-in shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl animate-fade-in shadow-sm">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span className="text-sm font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* A. CARD FORM PROFIL PENGGUNA */}
        <Card className="lg:col-span-2 border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#0B132B]">Profil Pengguna</CardTitle>
            <CardDescription className="text-slate-550">Lihat detail akun Anda dan ubah kolom yang diizinkan.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((vals) => updateProfileMutation.mutate(vals))} className="space-y-4">
              
              {/* Grid ID & Hak Akses */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* User ID (Read-only) */}
                <div className="space-y-1.5 opacity-70">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <Fingerprint className="h-3.5 w-3.5" /> ID Pengguna
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profile?.id || ""}
                    className="w-full px-3 py-2 bg-slate-100/50 border border-slate-200/80 rounded-xl text-sm text-slate-550 cursor-not-allowed"
                  />
                </div>

                {/* Jabatan/Role (Read-only) */}
                <div className="space-y-1.5 opacity-70">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" /> Jabatan / Hak Akses
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profile?.role || ""}
                    className="w-full px-3 py-2 bg-slate-100/50 border border-slate-200/80 rounded-xl text-sm text-slate-550 cursor-not-allowed uppercase font-bold"
                  />
                </div>
              </div>

              {/* Nama Lengkap */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-655 flex items-center gap-1.5" htmlFor="name">
                  <User className="h-3.5 w-3.5 text-indigo-500" /> Nama Lengkap
                </label>
                <input
                  id="name"
                  type="text"
                  className="w-full px-3 py-2 bg-white/45 border border-slate-200/80 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#0B132B]/10 focus:border-[#0B132B] transition-all font-semibold"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-rose-600 font-medium">{form.formState.errors.name.message}</p>
                )}
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-655 flex items-center gap-1.5" htmlFor="email">
                  <Mail className="h-3.5 w-3.5 text-indigo-500" /> Alamat Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full px-3 py-2 bg-white/45 border border-slate-200/80 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#0B132B]/10 focus:border-[#0B132B] transition-all font-semibold"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-rose-600 font-medium">{form.formState.errors.email.message}</p>
                )}
              </div>

              {/* Tombol Simpan */}
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-full py-2.5 px-4 bg-[#0B132B] hover:bg-[#1C2541] active:bg-[#0B132B] text-white text-sm font-bold rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 mt-6 cursor-pointer"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </button>
            </form>
          </CardContent>
        </Card>

        {/* B. CARD UNGGAH LOGO APLIKASI */}
        <Card className="lg:col-span-1 border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#0B132B]">Logo Aplikasi</CardTitle>
            <CardDescription className="text-slate-550">Ubah logo sistem untuk mengganti identitas visual di sidebar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Area Preview Logo (Dotted Drop-zone) */}
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 relative min-h-[160px] hover:bg-slate-100/50 hover:border-indigo-300 transition-colors">
              {logoPreview ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="relative h-16 w-full max-w-[200px]">
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      className="h-full w-full object-contain mx-auto"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Pratinjau Logo Baru</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <ImageIcon className="h-10 w-10 mb-2 stroke-1 text-indigo-500" />
                  <span className="text-xs text-slate-500 font-bold">Belum ada file dipilih</span>
                  <span className="text-[10px] text-slate-350">Format: PNG, JPG (Maks. 2MB)</span>
                </div>
              )}
            </div>

            {/* Input File & Tombol Unggah */}
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-12 border border-slate-200/80 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-650">
                    <Upload className="h-4 w-4 text-teal-650" />
                    Pilih File Logo
                  </div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleUploadLogo}
                disabled={!logoFile || uploadingLogo}
                className="w-full py-2.5 px-4 bg-[#0B132B] hover:bg-[#1C2541] active:bg-[#0B132B] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                {uploadingLogo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                    Mengunggah Logo...
                  </>
                ) : (
                  "Perbarui Logo"
                )}
              </button>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}

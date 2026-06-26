"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { 
  User, 
  Mail, 
  Shield, 
  Fingerprint, 
  Upload, 
  Loader2, 
  Image as ImageIcon,
  Building2,
  ShieldAlert,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { updateProfile } from "@/app/actions/user";
import { updateCompanyName } from "@/app/actions/config";

// =========================================================================
// SCHEMA VALIDASI
// =========================================================================
const profileSchema = z.object({
  name: z.string().min(3, "Nama lengkap minimal berisi 3 karakter"),
  email: z.string().email("Format email tidak valid"),
});

const companySchema = z.object({
  companyName: z.string().min(2, "Nama perusahaan minimal berisi 2 karakter").max(100, "Nama perusahaan maksimal 100 karakter"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type CompanyFormValues = z.infer<typeof companySchema>;

interface UnifiedSettingsFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  initialCompanyName: string;
}

export function UnifiedSettingsForm({ user, initialCompanyName }: UnifiedSettingsFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // State pesan global
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State untuk unggah logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // State submit loader
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingCompany, setUpdatingCompany] = useState(false);

  const isSuperAdmin = user.role === "SUPERADMIN";

  // Form hook untuk Profil
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
    },
  });

  // Form hook untuk Perusahaan
  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: initialCompanyName,
    },
  });

  // =========================================================================
  // HANDLERS
  // =========================================================================

  // Update Profil Pengguna
  const handleUpdateProfile = async (values: ProfileFormValues) => {
    setUpdatingProfile(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await updateProfile(values);
      if (res.success) {
        toast.success("Profil berhasil diperbarui!");
        setSuccessMsg("Profil pengguna berhasil diperbarui.");
        // Refresh router agar component server memuat data baru
        router.refresh();
      } else {
        toast.error(res.message || "Gagal memperbarui profil.");
        setErrorMsg(res.message || "Gagal memperbarui profil.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem.");
      setErrorMsg("Terjadi kesalahan sistem saat memperbarui profil.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Pilih file logo
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Ukuran file terlalu besar. Maksimal 2 MB.");
        setErrorMsg("Ukuran file terlalu besar. Maksimal adalah 2 MB.");
        return;
      }
      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      setErrorMsg(null);
    }
  };

  // Unggah Logo ke Server
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
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Terjadi kesalahan saat mengunggah logo.");
      }

      toast.success("Logo aplikasi berhasil diperbarui!");
      setSuccessMsg("Logo aplikasi berhasil diperbarui!");
      setLogoFile(null);
      setLogoPreview(null);
      
      // Invalidasi query logo agar Sidebar langsung memuat logo baru
      queryClient.invalidateQueries({ queryKey: ["app-logo"] });
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah logo.");
      setErrorMsg(err.message || "Gagal mengunggah logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  // Update Nama PT (Khusus Superadmin)
  const handleUpdateCompany = async (values: CompanyFormValues) => {
    if (!isSuperAdmin) {
      toast.error("Akses ditolak: Hanya SUPERADMIN yang diizinkan mengubah konfigurasi sistem.");
      return;
    }

    setUpdatingCompany(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await updateCompanyName(values.companyName);
      if (res.success) {
        toast.success(res.message || "Nama perusahaan berhasil diperbarui!");
        setSuccessMsg(res.message || "Nama perusahaan berhasil diperbarui!");
        // Refresh router agar layout dan navbar ter-update
        router.refresh();
      } else {
        toast.error(res.message || "Gagal memperbarui nama perusahaan.");
        setErrorMsg(res.message || "Gagal memperbarui nama perusahaan.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem.");
      setErrorMsg("Terjadi kesalahan sistem saat memperbarui nama perusahaan.");
    } finally {
      setUpdatingCompany(false);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Tabs Layout */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800">
          <TabsTrigger value="profile" className="flex items-center justify-center gap-1.5 py-2 font-semibold">
            <User className="h-4 w-4" />
            Profil Saya
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="system" className="flex items-center justify-center gap-1.5 py-2 font-semibold">
              <Building2 className="h-4 w-4" />
              Konfigurasi Sistem
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: Profil & Logo (Semua Role) */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            
            {/* Form Profil Pengguna */}
            <Card className="lg:col-span-2 border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0B132B] dark:text-zinc-100 flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5 text-indigo-500" />
                  Profil Pengguna
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-zinc-400">
                  Lihat detail akun Anda dan ubah kolom yang diizinkan.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={profileForm.handleSubmit(handleUpdateProfile)} className="space-y-4">
                  {/* Grid ID & Hak Akses (Read-only) */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 opacity-70">
                      <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <Fingerprint className="h-3.5 w-3.5" /> ID Pengguna
                      </label>
                      <input
                        type="text"
                        disabled
                        value={user.id}
                        className="w-full px-3 py-2 bg-slate-100/50 border border-slate-200/80 dark:bg-zinc-950/50 dark:border-zinc-800 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5 opacity-70">
                      <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5" /> Jabatan / Hak Akses
                      </label>
                      <input
                        type="text"
                        disabled
                        value={user.role}
                        className="w-full px-3 py-2 bg-slate-100/50 border border-slate-200/80 dark:bg-zinc-950/50 dark:border-zinc-800 rounded-xl text-sm text-slate-500 cursor-not-allowed uppercase font-bold"
                      />
                    </div>
                  </div>

                  {/* Nama Lengkap */}
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                      Nama Lengkap
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      className="w-full px-3 py-2 bg-white/40 dark:bg-zinc-950/40 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-sm text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-4 focus:ring-[#0B132B]/10 focus:border-[#0B132B] transition-all font-semibold"
                      {...profileForm.register("name")}
                    />
                    {profileForm.formState.errors.name && (
                      <p className="text-xs text-rose-600 font-medium">{profileForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  {/* Alamat Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                      Alamat Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      className="w-full px-3 py-2 bg-white/40 dark:bg-zinc-950/40 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-sm text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-4 focus:ring-[#0B132B]/10 focus:border-[#0B132B] transition-all font-semibold"
                      {...profileForm.register("email")}
                    />
                    {profileForm.formState.errors.email && (
                      <p className="text-xs text-rose-600 font-medium">{profileForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  {/* Tombol Simpan */}
                  <Button
                    type="submit"
                    disabled={updatingProfile || !profileForm.formState.isDirty}
                    className="w-full py-2.5 px-4 bg-[#0B132B] hover:bg-[#1C2541] active:bg-[#0B132B] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-sm font-bold rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatingProfile ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan Perubahan"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Card Unggah Logo Aplikasi */}
            <Card className="lg:col-span-1 border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#0B132B] dark:text-zinc-100 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-indigo-500" />
                  Logo Aplikasi
                </CardTitle>
                <CardDescription className="text-slate-550 dark:text-zinc-400">
                  Ubah logo sistem untuk mengganti identitas visual di sidebar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Area Preview Logo */}
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-zinc-850 rounded-xl bg-slate-50/50 dark:bg-zinc-950/20 relative min-h-[160px] hover:bg-slate-100/50 hover:border-indigo-300 transition-colors">
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
                      <span className="text-xs text-slate-500 dark:text-zinc-400 font-bold">Belum ada file dipilih</span>
                      <span className="text-[10px] text-slate-400">Format: PNG, JPG (Maks. 2MB)</span>
                    </div>
                  )}
                </div>

                {/* Input File & Tombol Unggah */}
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-12 border border-slate-200/80 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-zinc-300">
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
                    className="w-full py-2.5 px-4 bg-[#0B132B] hover:bg-[#1C2541] active:bg-[#0B132B] dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed dark:disabled:bg-zinc-900 text-white text-sm font-bold rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
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
        </TabsContent>

        {/* Tab 2: Konfigurasi Sistem (Hanya Superadmin) */}
        {isSuperAdmin && (
          <TabsContent value="system" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-teal-500 via-indigo-500 to-purple-500" />
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#0B132B] dark:text-zinc-100 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-indigo-500" />
                    Nama Perusahaan / PT
                  </CardTitle>
                  <CardDescription className="text-slate-550 dark:text-zinc-400">
                    Ubah nama PT yang akan ditampilkan di pojok kiri atas Topbar/Navbar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={companyForm.handleSubmit(handleUpdateCompany)} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="companyName" className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                        Nama Perusahaan
                      </Label>
                      <Input
                        id="companyName"
                        type="text"
                        disabled={updatingCompany}
                        className="w-full px-3 py-2 bg-white/40 dark:bg-zinc-950/40 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-sm text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-4 focus:ring-[#0B132B]/10 focus:border-[#0B132B] transition-all font-semibold"
                        {...companyForm.register("companyName")}
                        placeholder="Masukkan nama PT"
                      />
                      {companyForm.formState.errors.companyName && (
                        <p className="text-xs text-rose-600 font-medium">{companyForm.formState.errors.companyName.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={updatingCompany || !companyForm.formState.isDirty}
                      className="w-full py-2.5 px-4 bg-[#0B132B] hover:bg-[#1C2541] active:bg-[#0B132B] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-sm font-bold rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingCompany ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                          Menyimpan...
                        </>
                      ) : (
                        "Simpan Nama PT"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

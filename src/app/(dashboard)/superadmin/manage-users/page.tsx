"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Plus, 
  Key, 
  UserX, 
  UserCheck, 
  Loader2, 
  ShieldAlert, 
  Mail,
  User as UserIcon,
  Lock,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";

import { 
  getUsers, 
  createNewUserByAdmin, 
  resetUserPassword, 
  toggleUserStatus 
} from "@/app/actions/user";

// Zod schema for new user registration
const registerSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["SUPERADMIN", "MANAGER", "GUDANG", "PURCHASING", "SALES"]),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// Zod schema for password reset
const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password minimal 6 karakter"),
  confirmPassword: z.string().min(6, "Password minimal 6 karakter"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Konfirmasi password tidak cocok",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ManageUsersPage() {
  // Modal states
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string } | null>(null);

  // Submit loaders
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  // Check active user session/profile
  const { data: profileRes, isLoading: loadingProfile } = useQuery<{ id: string; name: string; role: string }>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Gagal mengambil profil.");
      const json = await res.json();
      return json.data;
    }
  });

  // Query all users
  const { data: usersRes, isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => getUsers(),
    enabled: profileRes?.role === "SUPERADMIN"
  });

  const users = usersRes?.success && usersRes.data ? usersRes.data : [];

  // Hook forms
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "password123", // Default placeholder
      role: "GUDANG",
    }
  });

  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    }
  });

  // Handle register submission
  async function onRegisterSubmit(values: RegisterFormValues) {
    setIsRegistering(true);
    try {
      const res = await createNewUserByAdmin(values);
      if (res.success) {
        toast.success(`Karyawan ${values.name} berhasil terdaftar!`);
        registerForm.reset({
          name: "",
          email: "",
          password: "password123",
          role: "GUDANG",
        });
        setIsRegisterOpen(false);
        refetchUsers();
      } else {
        toast.error(res.message || "Gagal mendaftarkan karyawan.");
      }
    } catch (err: any) {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsRegistering(false);
    }
  }

  // Handle reset password submission
  async function onResetSubmit(values: ResetPasswordFormValues) {
    if (!selectedUser) return;
    setIsResetting(true);
    try {
      const res = await resetUserPassword(selectedUser.id, values.password);
      if (res.success) {
        toast.success(`Password untuk ${selectedUser.name} berhasil di-reset!`);
        resetForm.reset({
          password: "",
          confirmPassword: "",
        });
        setIsResetOpen(false);
        setSelectedUser(null);
      } else {
        toast.error(res.message || "Gagal mereset password.");
      }
    } catch (err: any) {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsResetting(false);
    }
  }

  // Handle toggle user active/inactive status
  async function handleToggleStatus(userId: string, userName: string, currentActive: boolean) {
    setTogglingUserId(userId);
    try {
      const res = await toggleUserStatus(userId);
      if (res.success) {
        toast.success(`Akun ${userName} berhasil ${currentActive ? "dinonaktifkan" : "diaktifkan"}!`);
        refetchUsers();
      } else {
        toast.error(res.message || "Gagal mengubah status akun.");
      }
    } catch (err: any) {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setTogglingUserId(null);
    }
  }

  // 1. Loading Profile State
  if (loadingProfile) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-teal-650" />
        <p className="text-sm text-slate-500 font-medium font-sans">Memvalidasi otoritas akses...</p>
      </div>
    );
  }

  // 2. Unauthorized Role Check (RBAC)
  if (profileRes?.role !== "SUPERADMIN") {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center p-6 animate-in fade-in duration-300">
        <Card className="max-w-md w-full border border-red-200 bg-red-50/30 dark:bg-red-950/10 dark:border-red-900/40 rounded-2xl shadow-xl overflow-hidden">
          <CardHeader className="text-center pt-8 px-6">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-650 flex items-center justify-center shadow-md">
                <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-red-800 dark:text-red-400">
              Akses Ditolak
            </CardTitle>
            <CardDescription className="text-red-600/80 dark:text-red-400/80 text-sm mt-1">
              Unauthorized: Hanya Superadmin yang berhak mengakses halaman Manajemen Karyawan.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8 text-center">
            <p className="text-xs text-slate-500 mb-6">
              Sistem mencatat percobaan akses ini demi alasan audit keamanan. Silakan kembali ke dashboard utama Anda.
            </p>
            <Button 
              onClick={() => window.location.href = "/"}
              className="w-full bg-[#0B132B] hover:bg-[#1C2541] text-white font-bold rounded-xl shadow-md py-5 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 text-teal-400" /> Kembali ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper dynamic badge classes for roles
  const getRoleBadgeClasses = (role: string) => {
    switch (role) {
      case "SUPERADMIN":
        return "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/50";
      case "MANAGER":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50";
      case "GUDANG":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50";
      case "PURCHASING":
        return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/50";
      case "SALES":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50 flex items-center gap-2.5">
            <Users className="h-8 w-8 text-teal-650" />
            Manajemen Karyawan
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Kelola data karyawan, hak akses role (RBAC), reset password, dan status keaktifan akun secara terpusat.
          </p>
        </div>
        <Button 
          onClick={() => setIsRegisterOpen(true)}
          className="bg-[#0B132B] hover:bg-[#1C2541] text-white font-bold px-5 py-5 text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5 text-teal-400" />
          Daftarkan Karyawan Baru
        </Button>
      </div>

      {/* Main Card containing User List Table */}
      <Card className="border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#0B132B] dark:text-zinc-150">
            Daftar Karyawan Aktif & Sistem Keamanan
          </CardTitle>
          <CardDescription className="text-slate-550 text-xs">
            Seluruh data akun terdaftar di database inventaris. Superadmin berwenang menghentikan akses login secara instan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingUsers ? (
            <div className="flex h-36 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              Tidak ada karyawan terdaftar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#FAF9F5]/90 dark:bg-zinc-900 text-[#0B132B] dark:text-slate-350 font-bold border-b border-slate-150 dark:border-zinc-800 uppercase tracking-wider text-[10px]">
                  <TableRow>
                    <TableHead className="px-6 py-4">Karyawan / Nama</TableHead>
                    <TableHead className="px-6 py-4">Alamat Email</TableHead>
                    <TableHead className="px-6 py-4 text-center">Jabatan / Role</TableHead>
                    <TableHead className="px-6 py-4 text-center">Status Akses</TableHead>
                    <TableHead className="px-6 py-4">Tanggal Bergabung</TableHead>
                    <TableHead className="px-6 py-4 text-right">Aksi Keamanan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white/30 text-xs">
                  {users.map((u: any) => (
                    <TableRow key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                      
                      {/* Name with initials avatar */}
                      <TableCell className="px-6 py-4 font-bold text-slate-900 dark:text-zinc-150">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#0F2E2D] to-[#0B132B] text-white font-extrabold flex items-center justify-center shadow-sm text-xs">
                            {u.name.split(" ").slice(0,2).map((n: string) => n[0]).join("").toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-zinc-200">{u.name}</span>
                            {u.id === profileRes.id && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.2 text-[8px] font-extrabold uppercase dark:bg-zinc-800 dark:text-zinc-400">
                                Anda
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell className="px-6 py-4 text-slate-600 dark:text-zinc-400 font-medium">
                        {u.email}
                      </TableCell>

                      {/* Role Badge */}
                      <TableCell className="px-6 py-4 text-center">
                        <Badge className={`px-2.5 py-0.5 border ${getRoleBadgeClasses(u.role)} font-bold text-[9px] uppercase tracking-wider rounded-full shadow-xs`}>
                          {u.role}
                        </Badge>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell className="px-6 py-4 text-center">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[9px] font-bold dark:bg-emerald-950/20 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-800 border border-red-200 px-2.5 py-0.5 text-[9px] font-bold dark:bg-red-950/20 dark:text-red-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-650"></span>
                            Nonaktif
                          </span>
                        )}
                      </TableCell>

                      {/* Created At */}
                      <TableCell className="px-6 py-4 text-slate-450 font-semibold">
                        {new Date(u.createdAt).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* Reset Password Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(u);
                              setIsResetOpen(true);
                            }}
                            className="h-8 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-700 dark:text-zinc-300 font-bold px-3 text-[10px] rounded-lg shadow-xs cursor-pointer hover:bg-slate-50 flex items-center gap-1"
                          >
                            <Key className="h-3 w-3 text-indigo-500" />
                            Reset Password
                          </Button>

                          {/* Toggle Active Status Button */}
                          <Button
                            variant={u.isActive ? "destructive" : "default"}
                            size="sm"
                            disabled={togglingUserId === u.id || u.id === profileRes.id}
                            onClick={() => handleToggleStatus(u.id, u.name, u.isActive)}
                            className={`h-8 font-bold px-3 text-[10px] rounded-lg shadow-xs cursor-pointer flex items-center gap-1 ${
                              u.isActive 
                                ? "bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-200/50 hover:bg-red-100" 
                                : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-250 hover:bg-emerald-100"
                            }`}
                          >
                            {togglingUserId === u.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : u.isActive ? (
                              <>
                                <UserX className="h-3 w-3" />
                                Nonaktifkan
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3 w-3" />
                                Aktifkan
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog 1: Register New Employee Modal */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="sm:max-w-[425px] border border-white/40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#0B132B] dark:text-zinc-50 flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              Daftarkan Karyawan Baru
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Lengkapi formulir di bawah ini untuk membuat akun karyawan resmi. Password default dapat diubah mandiri oleh karyawan nantinya.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4 py-4">
            
            {/* Input Nama Lengkap */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <UserIcon className="h-3 w-3" /> Nama Lengkap
              </Label>
              <Input
                placeholder="John Doe"
                {...registerForm.register("name")}
                className="bg-white dark:bg-zinc-950 border-slate-200/80 rounded-xl text-xs font-semibold"
              />
              {registerForm.formState.errors.name && (
                <p className="text-[10px] text-red-500 font-semibold">{registerForm.formState.errors.name.message}</p>
              )}
            </div>

            {/* Input Email */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Mail className="h-3 w-3" /> Alamat Email
              </Label>
              <Input
                type="email"
                placeholder="nama@perusahaan.com"
                {...registerForm.register("email")}
                className="bg-white dark:bg-zinc-950 border-slate-200/80 rounded-xl text-xs font-semibold"
              />
              {registerForm.formState.errors.email && (
                <p className="text-[10px] text-red-500 font-semibold">{registerForm.formState.errors.email.message}</p>
              )}
            </div>

            {/* Input Password Default */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Lock className="h-3 w-3" /> Password Default
              </Label>
              <Input
                type="text"
                {...registerForm.register("password")}
                className="bg-white dark:bg-zinc-950 border-slate-200/80 rounded-xl text-xs font-semibold font-mono"
              />
              <span className="text-[9px] text-slate-400 font-medium">Bisa diganti setelah user login pertama kali.</span>
              {registerForm.formState.errors.password && (
                <p className="text-[10px] text-red-500 font-semibold">{registerForm.formState.errors.password.message}</p>
              )}
            </div>

            {/* Input Role / Jabatan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Jabatan / Hak Akses</Label>
              <select
                {...registerForm.register("role")}
                className="w-full py-2.5 px-3 bg-white dark:bg-zinc-950 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none cursor-pointer"
              >
                <option value="GUDANG">GUDANG (Staff Gudang)</option>
                <option value="PURCHASING">PURCHASING (Staf Pembelian)</option>
                <option value="SALES">SALES (Staf Penjualan)</option>
                <option value="MANAGER">MANAGER (Pengawas)</option>
                <option value="SUPERADMIN">SUPERADMIN (Pemilik/Developer)</option>
              </select>
              {registerForm.formState.errors.role && (
                <p className="text-[10px] text-red-500 font-semibold">{registerForm.formState.errors.role.message}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRegisterOpen(false)}
                className="text-xs font-bold rounded-xl border-slate-200 cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isRegistering}
                className="bg-[#0B132B] hover:bg-[#1C2541] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isRegistering && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Daftarkan Karyawan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Reset Password Modal */}
      <Dialog open={isResetOpen} onOpenChange={(open) => {
        setIsResetOpen(open);
        if (!open) {
          setSelectedUser(null);
          resetForm.reset();
        }
      }}>
        <DialogContent className="sm:max-w-[425px] border border-white/40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#0B132B] dark:text-zinc-50 flex items-center gap-2">
              <Key className="h-5 w-5 text-indigo-650" />
              Reset Password Karyawan
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Masukkan password baru untuk {selectedUser ? <b className="text-slate-800 dark:text-zinc-200">{selectedUser.name} ({selectedUser.email})</b> : "karyawan ini"}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4 py-4">
            
            {/* Password Baru */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Lock className="h-3 w-3" /> Password Baru
              </Label>
              <Input
                type="password"
                placeholder="Masukkan password baru"
                {...resetForm.register("password")}
                className="bg-white dark:bg-zinc-950 border-slate-200/80 rounded-xl text-xs font-semibold"
              />
              {resetForm.formState.errors.password && (
                <p className="text-[10px] text-red-500 font-semibold">{resetForm.formState.errors.password.message}</p>
              )}
            </div>

            {/* Konfirmasi Password Baru */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Lock className="h-3 w-3" /> Konfirmasi Password Baru
              </Label>
              <Input
                type="password"
                placeholder="Ketik ulang password baru"
                {...resetForm.register("confirmPassword")}
                className="bg-white dark:bg-zinc-950 border-slate-200/80 rounded-xl text-xs font-semibold"
              />
              {resetForm.formState.errors.confirmPassword && (
                <p className="text-[10px] text-red-500 font-semibold">{resetForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsResetOpen(false);
                  setSelectedUser(null);
                  resetForm.reset();
                }}
                className="text-xs font-bold rounded-xl border-slate-200 cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isResetting}
                className="bg-[#0B132B] hover:bg-[#1C2541] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isResetting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Simpan Password Baru
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

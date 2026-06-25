"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { registerUser } from "@/app/actions/auth"

const formSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["SUPERADMIN", "PURCHASING", "SALES", "GUDANG", "MANAGER"]),
})

export default function RegisterPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", password: "", role: "GUDANG" },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      const res = await registerUser(values)
      if (res.success) {
        toast.success("Pendaftaran berhasil! Mengalihkan...")
        router.push("/")
      } else {
        toast.error(res.message || "Gagal mendaftar")
      }
    } catch (e) {
      toast.error("Terjadi kesalahan sistem")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative"
    >
      {/* Decorative Outer Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-teal-500/20 to-amber-500/20 rounded-[32px] blur-xl opacity-75" />
      
      <Card className="relative border border-white/40 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md shadow-2xl rounded-[28px] overflow-hidden">
        <CardHeader className="space-y-2 text-center pt-8 px-8">
          <CardTitle className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">Buat Akun Baru</CardTitle>
          <CardDescription className="text-slate-650 dark:text-zinc-400">
            Isi data di bawah ini untuk mendaftarkan akun baru.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#0B132B] dark:text-zinc-350 text-xs font-bold uppercase tracking-wider">Nama Lengkap</Label>
              <Input 
                id="name" 
                placeholder="John Doe" 
                {...form.register("name")} 
                className="py-5 bg-white/50 dark:bg-zinc-800/50 border-slate-200/80 dark:border-zinc-800/80 focus:border-[#0B132B] focus:ring-[#0B132B]/10 focus:ring-4 focus:bg-white dark:focus:bg-zinc-950 transition-all duration-300 rounded-xl text-sm"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-rose-500 font-medium mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#0B132B] dark:text-zinc-350 text-xs font-bold uppercase tracking-wider">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="nama@perusahaan.com" 
                {...form.register("email")} 
                className="py-5 bg-white/50 dark:bg-zinc-800/50 border-slate-200/80 dark:border-zinc-800/80 focus:border-[#0B132B] focus:ring-[#0B132B]/10 focus:ring-4 focus:bg-white dark:focus:bg-zinc-950 transition-all duration-300 rounded-xl text-sm"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-rose-500 font-medium mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#0B132B] dark:text-zinc-350 text-xs font-bold uppercase tracking-wider">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                {...form.register("password")} 
                className="py-5 bg-white/50 dark:bg-zinc-800/50 border-slate-200/80 dark:border-zinc-800/80 focus:border-[#0B132B] focus:ring-[#0B132B]/10 focus:ring-4 focus:bg-white dark:focus:bg-zinc-950 transition-all duration-300 rounded-xl text-sm"
              />
              {form.formState.errors.password && (
                <p className="text-xs text-rose-500 font-medium mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-[#0B132B] dark:text-zinc-350 text-xs font-bold uppercase tracking-wider">Jabatan / Hak Akses</Label>
              <select 
                id="role" 
                {...form.register("role")} 
                className="w-full py-3 px-3 bg-white/50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-800/80 focus:border-[#0B132B] focus:ring-[#0B132B]/10 focus:ring-4 focus:bg-white dark:focus:bg-zinc-950 transition-all duration-300 rounded-xl text-sm font-semibold text-slate-800 dark:text-zinc-200 outline-none cursor-pointer"
              >
                <option value="SUPERADMIN">SUPERADMIN (Pemilik/Developer)</option>
                <option value="MANAGER">MANAGER (Pengawas)</option>
                <option value="GUDANG">GUDANG (Staff Gudang)</option>
                <option value="PURCHASING">PURCHASING (Staf Pembelian)</option>
                <option value="SALES">SALES (Staf Penjualan)</option>
              </select>
              {form.formState.errors.role && (
                <p className="text-xs text-rose-500 font-medium mt-1">{form.formState.errors.role.message}</p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full mt-4 py-5 bg-[#0B132B] hover:bg-[#1C2541] active:bg-[#0B132B] text-white font-bold rounded-xl shadow-lg shadow-[#0B132B]/10 hover:shadow-[#0B132B]/20 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer text-sm" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                  Mendaftarkan Akun...
                </span>
              ) : "Daftar Akun"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-white/20 dark:border-zinc-800/20 py-4 bg-white/30 dark:bg-zinc-900/20">
          <p className="text-xs text-slate-600 dark:text-zinc-400">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-bold text-[#0B132B] dark:text-teal-400 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

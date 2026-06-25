"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { loginUser } from "@/app/actions/auth"

const formSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
})

export default function LoginPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      const res = await loginUser(values)
      if (res.success) {
        toast.success("Berhasil login! Mengalihkan...")
        router.push("/")
      } else {
        toast.error(res.message || "Gagal login")
      }
    } catch (e) {
      toast.error("Terjadi kesalahan sistem")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      {/* Decorative Outer Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-teal-500/20 to-amber-500/20 rounded-[32px] blur-xl opacity-75" />
      
      <Card className="relative border border-white/40 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md shadow-2xl rounded-[28px] overflow-hidden">
        <CardHeader className="space-y-2 text-center pt-8 px-8">
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-2xl bg-[#0B132B] text-white flex items-center justify-center shadow-lg shadow-[#0B132B]/20">
              <Lock className="h-6 w-6 text-teal-400" />
            </div>
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">
            Selamat Datang
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-zinc-400 text-sm">
            Masukkan email dan password Anda untuk masuk ke sistem inventaris.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            
            {/* Input Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#0B132B] dark:text-zinc-350 text-xs font-bold uppercase tracking-wider">Email</Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0B132B] transition-colors">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="nama@perusahaan.com" 
                  {...form.register("email")} 
                  className="pl-11 py-5 bg-white/50 dark:bg-zinc-800/50 border-slate-200/80 dark:border-zinc-800/80 focus:border-[#0B132B] focus:ring-[#0B132B]/10 focus:ring-4 focus:bg-white dark:focus:bg-zinc-950 transition-all duration-300 rounded-xl text-sm"
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-xs text-rose-500 font-medium mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>
 
            {/* Input Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#0B132B] dark:text-zinc-350 text-xs font-bold uppercase tracking-wider">Password</Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0B132B] transition-colors">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  {...form.register("password")} 
                  className="pl-11 py-5 bg-white/50 dark:bg-zinc-800/50 border-slate-200/80 dark:border-zinc-800/80 focus:border-[#0B132B] focus:ring-[#0B132B]/10 focus:ring-4 focus:bg-white dark:focus:bg-zinc-950 transition-all duration-300 rounded-xl text-sm"
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-rose-500 font-medium mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>
 
            {/* Button Submit */}
            <Button 
              type="submit" 
              className="w-full mt-4 py-5 bg-[#0B132B] hover:bg-[#1C2541] active:bg-[#0B132B] text-white font-bold rounded-xl shadow-lg shadow-[#0B132B]/10 hover:shadow-[#0B132B]/20 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer text-sm" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-teal-400" />
                  Memproses Masuk...
                </>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  Masuk Ke Portal <ArrowRight className="h-4 w-4 text-teal-400" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-white/20 dark:border-zinc-800/20 py-4 bg-white/30 dark:bg-zinc-900/20">
          <p className="text-xs text-slate-600 dark:text-zinc-400">
            Belum punya akun?{" "}
            <Link href="/register" className="font-bold text-[#0B132B] dark:text-teal-400 hover:underline">
              Daftar sekarang
            </Link>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

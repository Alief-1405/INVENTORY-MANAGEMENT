"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { logoutUser } from "@/app/actions/auth"
import { LogOut, Settings, User } from "lucide-react"
import { toast } from "sonner"

export function Header({ userName = "User" }: { userName?: string }) {
  const router = useRouter()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleLogout = async () => {
    setShowDropdown(false)
    await logoutUser()
    toast.success("Berhasil logout")
    router.push("/login")
  }

  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-slate-200/80 bg-white/80 px-6 dark:bg-zinc-950/80 backdrop-blur-md">
      <div className="flex flex-1 items-center justify-between relative">
        <h1 className="text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Sistem Inventaris</h1>
        
        {/* Profile Area */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400">{userName}</span>
          
          {/* Avatar with Shiny Gradient Ring */}
          <div 
            className="relative group cursor-pointer" 
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-xs opacity-70 group-hover:opacity-100 transition duration-300" />
            <div className="relative h-8 w-8 rounded-full bg-slate-100 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95">
              {initials}
            </div>
          </div>

          {/* Interactive Dropdown Menu */}
          {showDropdown && (
            <>
              {/* Invisible Click-Outside Overlay */}
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={() => setShowDropdown(false)} 
              />
              
              <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-zinc-900">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Akun Aktif</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-zinc-200 truncate">{userName}</p>
                </div>
                <div className="py-1.5 space-y-0.5">
                  <Link 
                    href="/settings" 
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" />
                    Pengaturan Profil
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Keluar Sesi
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

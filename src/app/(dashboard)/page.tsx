"use client"

import React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { 
  Package, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Layers,
  ChevronRight,
  Loader2
} from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getDashboardStats } from "@/app/actions/product"
import ManagerDashboard from "@/components/dashboard/ManagerDashboard"
import PurchasingDashboard from "@/components/dashboard/PurchasingDashboard"

// Vibrant Premium Colors for Pie Chart
const COLORS = ["#8B5CF6", "#06B6D4", "#F59E0B", "#EF4444", "#3B82F6"] // Purple, Cyan, Orange/Amber, Red, Blue

export default function DashboardPage() {
  // Query data statistik dashboard dari server
  const { data: statsRes, isLoading, error } = useQuery({
    queryKey: ["dashboard-live-stats"],
    queryFn: () => getDashboardStats(),
    refetchOnWindowFocus: true
  })

  // Query data profil user untuk mengecek role di client-side
  const { data: profileRes } = useQuery<{ id: string; name: string; email: string; role: string }>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Gagal mengambil profil.");
      const json = await res.json();
      return json.data;
    }
  });

  const showAssetCard = profileRes?.role === "MANAGER" || profileRes?.role === "SUPERADMIN";

  if (isLoading) {
    return (
      <div className="flex h-[75vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-teal-650" />
        <p className="text-sm text-slate-500 font-medium">Memuat dashboard statistik...</p>
      </div>
    )
  }

  if (error || !statsRes?.success || !statsRes.data) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-center p-6 bg-red-50/50 border border-red-100 rounded-2xl">
        <AlertTriangle className="h-12 w-12 text-red-600 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Gagal Memuat Statistik</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md">
          {statsRes?.message || "Terjadi kesalahan koneksi saat mengambil data dari database."}
        </p>
        <Button onClick={() => window.location.reload()} className="mt-4 bg-slate-900 text-white hover:bg-slate-800">
          Coba Lagi
        </Button>
      </div>
    )
  }

  if (profileRes?.role === "MANAGER") {
    return <ManagerDashboard stats={statsRes.data as any} />
  }

  if (profileRes?.role === "PURCHASING") {
    return <PurchasingDashboard stats={statsRes.data as any} />
  }

  const {
    totalProducts,
    lowStockCount,
    totalAssetValue,
    criticalProducts,
    recentActivities,
    categoryComposition,
    mutationTrend
  } = statsRes.data

  return (
    <div className="space-y-6">
      {/* Header Dashboard */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">Dashboard</h1>
          <p className="text-slate-500 text-sm">
            Ringkasan data inventaris dan mutasi stok secara berkala (Real-time).
          </p>
        </div>
        <div className="text-xs text-[#0B132B] bg-white/70 backdrop-blur-md border border-white/40 px-4 py-2 rounded-xl shadow-sm font-semibold dark:bg-slate-900 dark:border-slate-800">
          Hari ini: {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}
        </div>
      </div>

      {/* Baris Pertama: Kartu Metrik Utama */}
      <div className={`grid gap-6 ${showAssetCard ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {/* Card 1: Total Produk - Aksen Ungu Pastel */}
        <Card className="hover:shadow-md transition-all duration-300 border border-white/40 border-l-4 border-l-purple-400 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Produk</CardTitle>
            <div className="rounded-xl bg-purple-50 p-2 dark:bg-purple-950/20 shadow-xs">
              <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">{totalProducts}</div>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">
              Produk aktif terdaftar di katalog inventaris.
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Peringatan Low Stock - Aksen Merah Coral */}
        <Card className="hover:shadow-md transition-all duration-300 border border-white/40 border-l-4 border-l-rose-455 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Peringatan Low Stock</CardTitle>
            <div className="rounded-xl bg-rose-50 p-2 dark:bg-rose-950/20 shadow-xs">
              <AlertTriangle className="h-5 w-5 text-rose-500 dark:text-rose-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-500">
              {lowStockCount}
            </div>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">
              Barang kritis di bawah batas minimum stok.
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Nilai Total Aset - Aksen Off-White Hangat */}
        {showAssetCard && (
          <Card className="hover:shadow-md transition-all duration-300 border border-white/40 border-l-4 border-l-[#ECE7DC] bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Nilai Total Aset</CardTitle>
              <div className="rounded-xl bg-amber-50 p-2 dark:bg-amber-950/20 shadow-xs">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-white">
                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(totalAssetValue)}
              </div>
              <p className="text-xs text-slate-400 mt-1.5 font-medium">
                Estimasi total harga jual stok di gudang.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Baris Kedua: Visualisasi Grafik */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Grafik Batang: Tren Mutasi Stok */}
        <Card className="lg:col-span-2 border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-[#0B132B] dark:text-zinc-150">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              Tren Mutasi Stok (7 Hari Terakhir)
            </CardTitle>
            <CardDescription className="text-slate-550">
              Perbandingan arus barang masuk (IN) dan keluar (OUT) berdasarkan mutasi riil.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mutationTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0/70" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(4px)", borderRadius: "12px", border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                  labelClassName="font-bold text-slate-800 text-xs"
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar dataKey="IN" name="Masuk (IN)" fill="#10b981" radius={[6, 6, 0, 0]} barSize={16} />
                <Bar dataKey="OUT" name="Keluar (OUT)" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Grafik Lingkaran: Komposisi Kategori */}
        <Card className="lg:col-span-1 border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-[#0B132B] dark:text-zinc-150">
              <Layers className="h-5 w-5 text-purple-650" />
              Komposisi Kategori
            </CardTitle>
            <CardDescription className="text-slate-550">Persentase sebaran stok barang per kategori produk.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[300px]">
            <div className="w-full h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={categoryComposition}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryComposition.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "11px", border: "1px solid #e2e8f0" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2 text-xs">
              {categoryComposition.map((entry: any, index: number) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full shadow-xs" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{entry.name}</span>
                  <span className="text-slate-400 font-medium">({entry.value}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Baris Ketiga: Ringkasan Data */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Kolom Kiri: Aktivitas Mutasi Terakhir */}
        <Card className="border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold text-[#0B132B]">Aktivitas Mutasi Terakhir</CardTitle>
              <CardDescription className="text-slate-550">Daftar 5 pergerakan barang terbaru di gudang.</CardDescription>
            </div>
            <Link href="/movements">
              <Button variant="ghost" size="sm" className="text-xs font-bold group text-teal-650 hover:text-teal-700">
                Semua
                <ChevronRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            {recentActivities.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-center text-xs text-muted-foreground">
                Belum ada aktivitas mutasi yang tercatat.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#FAF9F5]/80 text-[#0B132B] dark:bg-slate-900 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Waktu</th>
                      <th className="px-4 py-3">Produk</th>
                      <th className="px-4 py-3 text-center">Tipe</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white/40">
                    {recentActivities.map((act: any) => (
                      <tr key={act.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-medium">{act.time}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          <div className="font-bold">{act.product}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{act.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {act.type === "IN" && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/50 px-2.5 py-0.5 text-[10px] font-bold dark:bg-emerald-500/10 dark:text-emerald-400">
                              <ArrowDownLeft className="h-3 w-3" />
                              IN
                            </span>
                          )}
                          {act.type === "OUT" && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200/50 px-2.5 py-0.5 text-[10px] font-bold dark:bg-rose-500/10 dark:text-rose-400">
                              <ArrowUpRight className="h-3 w-3" />
                              OUT
                            </span>
                          )}
                          {act.type === "TRANSFER" && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200/50 px-2.5 py-0.5 text-[10px] font-bold dark:bg-blue-500/10 dark:text-blue-400">
                              <ArrowLeftRight className="h-3 w-3" />
                              TRF
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-slate-800 dark:text-slate-200">
                          {act.qty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kolom Kanan: Produk Low Stock (Kritis) */}
        <Card className="border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold text-[#0B132B]">Produk Low Stock (Kritis)</CardTitle>
              <CardDescription className="text-slate-550">Batas minimum terlampaui. Butuh tindakan segera.</CardDescription>
            </div>
            <Link href="/products">
              <Button variant="ghost" size="sm" className="text-xs font-bold group text-teal-650 hover:text-teal-700">
                Lihat Semua
                <ChevronRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            {criticalProducts.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-center text-xs text-muted-foreground bg-slate-50/50 rounded-2xl border border-dashed">
                Semua stok produk dalam kondisi aman.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#FAF9F5]/80 text-[#0B132B] dark:bg-slate-900 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Produk</th>
                      <th className="px-4 py-3 text-right">Stok Sisa</th>
                      <th className="px-4 py-3 text-right">Min. Stok</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white/40">
                    {criticalProducts.map((prod: any) => (
                      <tr key={prod.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-zinc-100">
                          <div className="font-bold">{prod.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{prod.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                            prod.stock === 0 
                              ? "bg-red-50 text-red-700 border-red-200/50 dark:bg-red-950/40 dark:text-red-400" 
                              : "bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/40 dark:text-amber-400"
                          }`}>
                            {prod.stock} Pcs
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-500">
                          {prod.minStock} Pcs
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link href="/movements">
                            <Button 
                              size="sm" 
                              className="h-6.5 px-3 text-[10px] bg-[#0B132B] hover:bg-[#1C2541] text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 font-bold rounded-lg shadow-sm"
                            >
                              Restock
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

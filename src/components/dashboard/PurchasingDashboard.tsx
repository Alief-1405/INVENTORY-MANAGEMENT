"use client";

import React from "react";
import { 
  Package, 
  AlertTriangle, 
  ShoppingCart, 
  ArrowRight,
  ShieldCheck,
  TrendingDown
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CriticalProduct {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  buyPrice: number;
  sellPrice: number;
  supplierId: string | null;
}

interface PurchasingDashboardProps {
  stats: {
    totalProducts: number;
    lowStockCount: number;
    criticalProducts: CriticalProduct[];
  };
}

export default function PurchasingDashboard({ stats }: PurchasingDashboardProps) {
  const { totalProducts, lowStockCount, criticalProducts } = stats;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Dashboard */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">
          Dashboard Pengadaan
        </h1>
        <p className="text-slate-500 text-sm">
          Monitoring stok kritis secara real-time dan ajukan Purchase Order Restock dengan cepat.
        </p>
      </div>

      {/* Baris Pertama: Kartu Metrik Utama */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Total Produk */}
        <Card className="hover:shadow-md transition-all duration-300 border border-white/40 border-l-4 border-l-purple-400 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Katalog Produk</CardTitle>
            <div className="rounded-xl bg-purple-50 p-2 dark:bg-purple-950/20 shadow-xs">
              <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">{totalProducts}</div>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">
              Jumlah katalog aktif terdaftar di sistem.
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Produk Low Stock */}
        <Card className="hover:shadow-md transition-all duration-300 border border-white/40 border-l-4 border-l-rose-500 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Stok Kritis (Low Stock)</CardTitle>
            <div className="rounded-xl bg-rose-50 p-2 dark:bg-rose-950/20 shadow-xs">
              <AlertTriangle className="h-5 w-5 text-rose-500 dark:text-rose-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-500">
              {lowStockCount}
            </div>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">
              Barang yang harus segera di-restock (Stok &le; Batas Minimum).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Baris Kedua: Tabel Low Stock Alerts */}
      <Card className="border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-[#0B132B] flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-rose-500" />
            Peringatan Low Stock (Stok Kritis)
          </CardTitle>
          <CardDescription className="text-slate-500">
            Daftar produk dengan tingkat persediaan kritis. Gunakan tombol cepat untuk restock instan.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {criticalProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <ShieldCheck className="h-10 w-10 text-emerald-600 mb-2 stroke-1" />
              <h4 className="font-bold text-slate-800">Semua Stok Aman</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Tidak ada produk di bawah batas stok minimum saat ini.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-850 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAF9F5]/90 text-[#0B132B] dark:bg-slate-900 dark:text-slate-300 font-bold border-b border-slate-200/80 dark:border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Nama Produk</th>
                    <th className="px-4 py-3 text-right">Stok Saat Ini</th>
                    <th className="px-4 py-3 text-right">Batas Min. Stok</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Aksi Cepat Restock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white/40">
                  {criticalProducts.map((prod) => {
                    // Kalkulasi restock quantity (misal: restock 50 unit)
                    const restockAmount = Number(prod.buyPrice) * 50;
                    const queryParams = prod.supplierId 
                      ? `?supplierId=${prod.supplierId}&amount=${restockAmount}` 
                      : `?amount=${restockAmount}`;

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-500">{prod.sku}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{prod.name}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-rose-600">
                          {prod.stock} Pcs
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-500">
                          {prod.minStock} Pcs
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-extrabold border uppercase ${
                            prod.stock === 0
                              ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400"
                          }`}>
                            {prod.stock === 0 ? "Habis" : "Kritis"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <Link href={`/purchase-orders${queryParams}`}>
                              <Button
                                size="sm"
                                className="h-7.5 px-3 bg-[#0B132B] hover:bg-[#1C2541] text-white dark:bg-slate-100 dark:text-slate-900 font-bold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
                              >
                                <ShoppingCart className="h-3.5 w-3.5 text-teal-400" />
                                Buat PO Restock
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

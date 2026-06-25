"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  FilePlus, 
  User, 
  ShoppingCart, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { getProducts } from "@/app/actions/product";
import { createSalesOrder } from "@/app/actions/sales";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SalesOrderPage() {
  const [customerName, setCustomerName] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch data profil user untuk nama sales
  const { data: profileRes, isLoading: loadingProfile } = useQuery<{ id: string; name: string; role: string }>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Gagal mengambil profil.");
      const json = await res.json();
      return json.data;
    }
  });

  // 2. Fetch data produk untuk dropdown pilihan
  const { data: productsRes, isLoading: loadingProducts } = useQuery({
    queryKey: ["sales-products-list"],
    queryFn: () => getProducts()
  });

  const isSalesOrAdmin = profileRes?.role === "SALES" || profileRes?.role === "SUPERADMIN";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSalesOrAdmin) {
      toast.error("Akses ditolak: Hanya role SALES yang diizinkan.");
      return;
    }

    if (!customerName.trim()) {
      toast.error("Harap masukkan nama customer.");
      return;
    }

    if (!productId) {
      toast.error("Harap pilih produk terlebih dahulu.");
      return;
    }

    if (quantity <= 0) {
      toast.error("Kuantitas pemesanan harus minimal 1 unit.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createSalesOrder(customerName, productId, quantity, notes);
      if (res.success && res.data) {
        toast.success(`Sales Order ${res.data.soNumber} berhasil dibuat dengan status PENDING_PREPARATION.`);
        // Reset form
        setCustomerName("");
        setProductId("");
        setQuantity(1);
        setNotes("");
      } else {
        toast.error(res.message || "Gagal membuat Sales Order.");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem saat menyimpan Sales Order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProfile || loadingProducts) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-teal-650" />
        <p className="text-sm text-slate-500 font-medium">Memuat formulir Sales Order...</p>
      </div>
    );
  }

  const products = productsRes?.success && productsRes.data ? productsRes.data : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Halaman */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">
          Sales Order (SO) Baru
        </h1>
        <p className="text-slate-500 text-sm">
          Pencatatan pesanan barang dari pelanggan. Dokumen SO ini otomatis berstatus draft pemrosesan awal.
        </p>
      </div>

      {/* Warning Otoritas Akses */}
      {!isSalesOrAdmin && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-250 text-amber-800 rounded-2xl max-w-xl text-xs font-semibold">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <span>Sebagai role <b>{profileRes?.role}</b>, Anda tidak diizinkan membuat SO baru secara resmi. Halaman ini hanya untuk role <b>SALES</b> atau <b>SUPERADMIN</b>.</span>
        </div>
      )}

      {/* Grid Utama Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Kolom Kiri: Form Input SO */}
        <Card className="md:col-span-2 border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-[#0B132B] flex items-center gap-2">
              <FilePlus className="h-5 w-5 text-indigo-650" />
              Formulir Permintaan Barang
            </CardTitle>
            <CardDescription className="text-slate-550 text-xs">
              Isi data detail customer dan barang yang dipesan. Stok barang gudang tidak akan berkurang sebelum diverifikasi petugas gudang.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Operator/Sales otomatis */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    Sales / Operator
                  </label>
                  <input
                    type="text"
                    value={profileRes?.name || ""}
                    disabled
                    className="w-full py-2.5 px-3 bg-slate-100/65 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-550 dark:text-zinc-400 cursor-not-allowed outline-none"
                  />
                </div>

                {/* Nomor SO otomatis */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Nomor SO (Dihasilkan Otomatis)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: SO-20260625-0001"
                    disabled
                    className="w-full py-2.5 px-3 bg-slate-100/65 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-slate-400 cursor-not-allowed outline-none"
                  />
                </div>

                {/* Pelanggan */}
                <div className="space-y-1.5">
                  <label htmlFor="customerName" className="text-xs font-bold text-slate-500">Nama Pelanggan / Customer</label>
                  <input
                    id="customerName"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Toko Berkah Abadi"
                    required
                    disabled={!isSalesOrAdmin}
                    className="w-full py-2.5 px-3 bg-white/80 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none"
                  />
                </div>

                {/* Kuantitas (QTY) */}
                <div className="space-y-1.5">
                  <label htmlFor="quantity" className="text-xs font-bold text-slate-500">Kuantitas Barang (QTY)</label>
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    placeholder="Contoh: 15"
                    required
                    disabled={!isSalesOrAdmin}
                    className="w-full py-2.5 px-3 bg-white/80 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none"
                  />
                </div>

                {/* Pilihan Produk */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="productId" className="text-xs font-bold text-slate-500">Pilih Produk</label>
                  <select
                    id="productId"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    required
                    disabled={!isSalesOrAdmin}
                    className="w-full py-2.5 px-3 bg-white/80 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-850 dark:text-zinc-200 outline-none cursor-pointer"
                  >
                    <option value="">-- Pilih Produk yang Dipesan --</option>
                    {products.map((prod: any) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} (SKU: {prod.sku}) — Sisa Stok Gudang: {prod.stock} Pcs
                      </option>
                    ))}
                  </select>
                </div>

                {/* Catatan tambahan */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="notes" className="text-xs font-bold text-slate-500">Catatan Tambahan / Alamat Pengiriman</label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Kirim via kurir instan, atau tinggalkan catatan instruksi kemasan khusus."
                    rows={3}
                    disabled={!isSalesOrAdmin}
                    className="w-full p-3 bg-white/80 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 focus:border-[#0B132B] rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none resize-none"
                  />
                </div>
              </div>

              {/* Tombol Submit */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={submitting || !isSalesOrAdmin}
                  className="w-full py-2.5 bg-[#0B132B] hover:bg-[#1C2541] active:bg-[#0B132B] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan Sales Order...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 text-teal-400" />
                      Simpan & Kirim ke Gudang
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Kolom Kanan: Panduan Alur Transaksi */}
        <Card className="border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#0B132B] dark:text-zinc-150">Alur Sales Order</CardTitle>
            <CardDescription className="text-slate-500 text-xs">Bagaimana pesanan ini diproses?</CardDescription>
          </CardHeader>
          <CardContent className="text-xs space-y-4">
            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-600 text-xs">1</div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-zinc-250">Input Order Penjualan</h4>
                <p className="text-slate-500 text-[11px] mt-0.5">Sales menginput pelanggan dan kuantitas barang. Status: <b>PENDING_PREPARATION</b>.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-600 text-xs">2</div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-zinc-250">Pemeriksaan & Pengemasan</h4>
                <p className="text-slate-500 text-[11px] mt-0.5">Orang Gudang mencari Nomor SO tersebut di halaman pengeluaran barang untuk diverifikasi.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-600 text-xs">3</div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-zinc-250">Pengurangan Stok & DO</h4>
                <p className="text-slate-500 text-[11px] mt-0.5">Stok terpotong, Delivery Order (DO) diterbitkan, dan status SO diselesaikan (<b>DONE</b>).</p>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-start gap-2 text-emerald-800 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><b>Keamanan Stok:</b> Stok tidak akan terpotong secara tidak sengaja sebelum barang benar-benar dikemas oleh Gudang.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Search, 
  Truck, 
  User, 
  Package, 
  ArrowRight, 
  Loader2, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  Clock,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { getSalesOrderDetailsByNo, confirmDispatch, cancelOrderByWarehouse } from "@/app/actions/sales";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DispatchOrderPage() {
  const queryClient = useQueryClient();
  const [soSearchInput, setSoSearchInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [soDetails, setSoDetails] = useState<any | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // 1. Fetch user profile to verify role
  const { data: profileRes, isLoading: loadingProfile } = useQuery<{ id: string; name: string; role: string }>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Gagal mengambil profil.");
      const json = await res.json();
      return json.data;
    }
  });

  const isGudangOrAdmin = profileRes?.role === "GUDANG" || profileRes?.role === "SUPERADMIN";

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soSearchInput.trim()) {
      toast.error("Harap masukkan Nomor SO.");
      return;
    }

    setSearching(true);
    setSoDetails(null);
    setShowCancelConfirm(false);
    try {
      const res = await getSalesOrderDetailsByNo(soSearchInput.trim());
      if (res.success && res.data) {
        setSoDetails(res.data);
        toast.success("Data Sales Order berhasil ditemukan.");
      } else {
        toast.error(res.message || "Sales Order tidak ditemukan.");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem saat mencari Sales Order.");
    } finally {
      setSearching(false);
    }
  };

  const handleConfirmDispatch = async () => {
    if (!soDetails) return;
    
    setConfirming(true);
    try {
      const res = await confirmDispatch(soDetails.id);
      if (res.success && res.data) {
        const payload = res.data;
        toast.success(`Barang berhasil dikeluarkan! DO No: ${payload.deliveryOrder.doNumber} diterbitkan.`);
        // Reload details to show updated state
        const updatedRes = await getSalesOrderDetailsByNo(soDetails.soNumber);
        if (updatedRes.success && updatedRes.data) {
          setSoDetails(updatedRes.data);
        }
        queryClient.invalidateQueries({ queryKey: ["dashboard-live-stats"] });
      } else {
        toast.error(res.message || "Gagal mengkonfirmasi pengeluaran barang.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan sistem saat memproses.");
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!soDetails) return;
    
    setCancelling(true);
    try {
      const res = await cancelOrderByWarehouse(soDetails.id);
      if (res.success && res.data) {
        toast.success(`Sales Order ${soDetails.soNumber} berhasil dibatalkan.`);
        // Reload details to show updated state
        const updatedRes = await getSalesOrderDetailsByNo(soDetails.soNumber);
        if (updatedRes.success && updatedRes.data) {
          setSoDetails(updatedRes.data);
        }
        setShowCancelConfirm(false);
        queryClient.invalidateQueries({ queryKey: ["dashboard-live-stats"] });
      } else {
        toast.error(res.message || "Gagal membatalkan Sales Order.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan sistem saat membatalkan.");
    } finally {
      setCancelling(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-teal-650" />
        <p className="text-sm text-slate-500 font-medium">Memuat halaman pengeluaran...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Halaman */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">
          Proses Pengeluaran Barang (Dispatch / DO)
        </h1>
        <p className="text-slate-500 text-sm">
          Cari Sales Order (SO) aktif dari divisi Sales, siapkan barang dari rak, lalu konfirmasikan pengiriman untuk mengurangi stok gudang.
        </p>
      </div>

      {/* Warning Otoritas Akses */}
      {!isGudangOrAdmin && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-250 text-amber-800 rounded-2xl max-w-xl text-xs font-semibold">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <span>Sebagai role <b>{profileRes?.role}</b>, Anda tidak diizinkan memproses pengeluaran barang. Halaman ini hanya untuk role <b>GUDANG</b> atau <b>SUPERADMIN</b>.</span>
        </div>
      )}

      {/* Panel Pencarian */}
      <Card className="border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm max-w-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-[#0B132B] flex items-center gap-2">
            <Search className="h-4.5 w-4.5 text-indigo-600" />
            Scan / Cari Nomor Sales Order (SO)
          </CardTitle>
          <CardDescription className="text-slate-500 text-xs">
            Masukkan nomor SO lengkap (contoh: SO-20260625-0001) untuk menarik rincian pesanan dari database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={soSearchInput}
              onChange={(e) => setSoSearchInput(e.target.value)}
              placeholder="SO-YYYYMMDD-XXXX"
              required
              disabled={!isGudangOrAdmin}
              className="flex-1 py-2.5 px-3 bg-white/80 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-zinc-200 outline-none uppercase placeholder:lowercase"
            />
            <Button
              type="submit"
              disabled={searching || !isGudangOrAdmin}
              className="bg-[#0B132B] hover:bg-[#1C2541] active:bg-[#0B132B] text-white px-5 rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
            >
              {searching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              Cari SO
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Detail Rincian SO (Ditampilkan jika ditemukan) */}
      {soDetails && (
        <div className="grid gap-6 md:grid-cols-3 animate-in slide-in-from-bottom duration-300">
          {/* Kolom Kiri & Tengah: Rincian Barang & Konfirmasi */}
          <Card className="md:col-span-2 border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-zinc-850 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold text-[#0B132B] flex items-center gap-1.5">
                    <FileText className="h-5 w-5 text-indigo-650" />
                    Rincian Order: {soDetails.soNumber}
                  </CardTitle>
                  <CardDescription className="text-slate-500 text-xs mt-0.5">
                    Detail pesanan barang yang dikirim oleh divisi Sales.
                  </CardDescription>
                </div>
                <div>
                  {soDetails.status === "DONE" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-250 px-2.5 py-0.5 text-[10px] font-extrabold uppercase dark:bg-emerald-950/20 dark:text-emerald-400">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Selesai (DO Diterbitkan)
                    </span>
                  ) : soDetails.status === "PAID" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase dark:bg-blue-950/20 dark:text-blue-400 animate-pulse">
                      <Clock className="h-3.5 w-3.5" />
                      Lunas, Siap Persiapan
                    </span>
                  ) : soDetails.status === "CANCELLED" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-0.5 text-[10px] font-extrabold uppercase dark:bg-zinc-800 dark:text-zinc-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Dibatalkan Gudang
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-800 border border-red-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase dark:bg-red-950/20 dark:text-red-400">
                      <Clock className="h-3.5 w-3.5" />
                      Menunggu Pembayaran
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-6">
              {/* Informasi Header SO */}
              <div className="grid gap-4 sm:grid-cols-3 text-xs">
                <div className="p-3 bg-white/40 rounded-xl border border-slate-100/50 dark:border-zinc-850 flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg text-indigo-600">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Nama Pelanggan</div>
                    <div className="font-extrabold text-slate-800 dark:text-zinc-200">{soDetails.customerName}</div>
                  </div>
                </div>

                <div className="p-3 bg-white/40 rounded-xl border border-slate-100/50 dark:border-zinc-850 flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg text-indigo-600">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Sales Pembuat SO</div>
                    <div className="font-extrabold text-slate-800 dark:text-zinc-200">{soDetails.createdBy.name}</div>
                  </div>
                </div>

                <div className="p-3 bg-white/40 rounded-xl border border-slate-100/50 dark:border-zinc-850 flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg text-indigo-600">
                    <CheckCircle className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Status Pembayaran</div>
                    <div className="font-extrabold text-slate-800 dark:text-zinc-200">
                      {soDetails.status === "DONE" || soDetails.status === "PAID" ? (
                        <span className="text-emerald-600">LUNAS ({soDetails.paymentMethod || "QRIS"})</span>
                      ) : (
                        <span className="text-red-500 font-extrabold">BELUM BAYAR</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rincian Barang yang Harus Diambil */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-slate-400" />
                  Daftar Barang yang Harus Diambil dari Rak
                </h4>
                
                <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-zinc-800 bg-white/35">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#FAF9F5]/70 text-[#0B132B] dark:bg-zinc-950 dark:text-slate-350 font-bold border-b border-slate-100 dark:border-zinc-800 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Nama Barang / SKU</th>
                        <th className="px-4 py-3 text-right">QTY Diambil</th>
                        <th className="px-4 py-3 text-right">Stok Aktif Gudang</th>
                        <th className="px-4 py-3 text-center">Kecukupan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                      <tr>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 dark:text-zinc-150">{soDetails.product.name}</span>
                          <div className="text-[9px] font-mono text-slate-400 mt-0.5">SKU: {soDetails.product.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-slate-850 dark:text-slate-200">
                          {soDetails.quantity} Pcs
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-500">
                          {soDetails.product.stock} Pcs
                        </td>
                        <td className="px-4 py-3 text-center">
                          {soDetails.product.stock >= soDetails.quantity ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[9px] font-extrabold uppercase">
                              Cukup
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-[9px] font-extrabold uppercase animate-pulse">
                              Kurang
                            </span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Catatan Sales */}
              {soDetails.notes && (
                <div className="p-3 bg-indigo-50/30 border border-indigo-100/50 dark:border-zinc-800 dark:bg-zinc-950/20 rounded-xl text-xs">
                  <span className="font-bold text-slate-650 dark:text-zinc-400 block mb-0.5">Catatan Tambahan Sales:</span>
                  <p className="text-slate-500 font-medium italic">"{soDetails.notes}"</p>
                </div>
              )}

              {/* Tombol Aksi Pengeluaran */}
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-900">
                {soDetails.status === "DONE" ? (
                  <div className="flex flex-col items-center justify-center p-4 bg-emerald-50/30 rounded-xl border border-dashed border-emerald-250 text-emerald-855 dark:text-emerald-400 text-center text-xs">
                    <CheckCircle className="h-8 w-8 text-emerald-600 mb-1.5 shrink-0" />
                    <span className="font-bold">Barang Telah Berhasil Dikeluarkan</span>
                    <span className="text-[10px] text-slate-500 font-semibold mt-1">
                      Nomor DO Terbit: <b>{soDetails.deliveryOrder?.doNumber}</b> pada {new Date(soDetails.deliveryOrder?.createdAt).toLocaleString("id-ID")}
                    </span>
                  </div>
                ) : soDetails.status === "CANCELLED" ? (
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50/30 rounded-xl border border-dashed border-slate-300 text-slate-750 dark:text-slate-400 text-center text-xs">
                    <AlertTriangle className="h-8 w-8 text-slate-500 mb-1.5 shrink-0" />
                    <span className="font-bold">Sales Order Dibatalkan</span>
                    <span className="text-[10px] text-slate-550 font-semibold mt-1">
                      Pesanan ini telah dibatalkan oleh pihak Gudang dan tidak dapat diproses lebih lanjut.
                    </span>
                  </div>
                ) : showCancelConfirm ? (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 rounded-xl space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold text-xs text-rose-850 dark:text-rose-400 block">Konfirmasi Pembatalan Pesanan</span>
                        <span className="text-[10px] text-slate-500 font-medium">Apakah Anda yakin ingin membatalkan Sales Order ini? Aksi ini akan mengubah status SO menjadi DIBATALKAN dan membebaskan antrean pengeluaran.</span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 text-xs">
                      <Button
                        onClick={() => setShowCancelConfirm(false)}
                        disabled={cancelling}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg cursor-pointer dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        Kembali
                      </Button>
                      <Button
                        onClick={handleCancelOrder}
                        disabled={cancelling}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        {cancelling ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Ya, Batalkan SO"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={handleConfirmDispatch}
                        disabled={confirming || cancelling || soDetails.status === "PENDING_PAYMENT" || soDetails.product.stock < soDetails.quantity}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                      >
                        {confirming ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Memproses...
                          </>
                        ) : (
                          <>
                            <Truck className="h-4 w-4 text-emerald-350" />
                            Konfirmasi Pengeluaran Barang
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={() => setShowCancelConfirm(true)}
                        disabled={confirming || cancelling || soDetails.status !== "PENDING_PAYMENT"}
                        className="py-2.5 px-4 bg-rose-600 hover:bg-rose-750 active:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-650 disabled:shadow-none disabled:cursor-not-allowed border-none outline-none"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Batalkan Pesanan
                      </Button>
                    </div>

                    {soDetails.status === "PENDING_PAYMENT" && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-start gap-2">
                        <AlertTriangle className="h-4.5 w-4.5 text-red-650 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[10px] block">
                            Barang tidak bisa dikeluarkan, Customer belum bayar.
                          </span>
                          <span className="text-[9px] text-red-700">
                            Gudang dapat membatalkan pesanan ini jika customer menahan stok terlalu lama.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Kolom Kanan: Rencana Surat Jalan (Delivery Order) */}
          <Card className="border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-[#0B132B] dark:text-zinc-150">Delivery Order (DO)</CardTitle>
              <CardDescription className="text-slate-500 text-xs">Informasi Surat Jalan Rencana Pengiriman</CardDescription>
            </CardHeader>
            <CardContent className="text-xs space-y-4">
              <div className="p-3.5 bg-white/80 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-xl space-y-3 font-mono text-[10px] text-slate-650 dark:text-zinc-400">
                <div className="border-b border-dashed border-slate-200 dark:border-zinc-800 pb-2 text-center">
                  <div className="font-extrabold text-slate-800 dark:text-zinc-200 uppercase">SURAT JALAN GUDANG</div>
                  <div className="text-[9px] text-slate-400 font-medium">INVENTORY SYSTEM INTEGRATED</div>
                </div>

                <div className="space-y-1">
                  <div><b>NO. DO:</b> {soDetails.status === "DONE" ? soDetails.deliveryOrder?.doNumber : "DO-YYYYMMDD-XXXX (Rancangan)"}</div>
                  <div><b>NO. SO:</b> {soDetails.soNumber}</div>
                  <div><b>CUSTOMER:</b> {soDetails.customerName}</div>
                  <div><b>SALES:</b> {soDetails.createdBy.name}</div>
                  <div><b>DATE:</b> {soDetails.status === "DONE" ? new Date(soDetails.deliveryOrder.createdAt).toLocaleDateString("id-ID") : new Date().toLocaleDateString("id-ID")}</div>
                </div>

                <div className="border-t border-b border-dashed border-slate-200 dark:border-zinc-800 py-1.5 space-y-1">
                  <div className="flex justify-between font-extrabold">
                    <span>ITEM</span>
                    <span>QTY</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="truncate max-w-[130px]">{soDetails.product.name}</span>
                    <span>{soDetails.quantity} Pcs</span>
                  </div>
                </div>

                 <div className="text-center text-[9px] text-slate-400 font-medium">
                  {soDetails.status === "DONE" 
                    ? "STATUS: BARANG TELAH DIKIRIM" 
                    : soDetails.status === "PAID" 
                      ? "STATUS: LUNAS, DRAF PERSIAPAN BARANG" 
                      : soDetails.status === "CANCELLED"
                        ? "STATUS: DIBATALKAN GUDANG"
                        : "STATUS: MENUNGGU PEMBAYARAN"}
                </div>
              </div>

              {soDetails.product.stock < soDetails.quantity && soDetails.status === "PAID" && (
                <div className="p-3 bg-rose-50 border border-rose-150 text-rose-800 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-bold text-[10px]">Stok gudang tidak cukup untuk memenuhi pesanan ini! Pengeluaran barang dinonaktifkan.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

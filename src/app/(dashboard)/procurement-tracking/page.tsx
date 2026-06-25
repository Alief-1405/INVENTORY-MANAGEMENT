"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, 
  Clock, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  PackageOpen, 
  User, 
  Calendar,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { getPurchaseOrdersForTracking, receivePurchaseOrder } from "@/app/actions/purchase-order";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface POTrackingItem {
  id: string;
  poNumber: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "RECEIVED";
  totalCost: number;
  managerNotes: string | null;
  supplierId: string;
  createdById: string;
  approvedById: string | null;
  productId: string | null;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  supplier: {
    name: string;
  };
  product?: {
    name: string;
    sku: string;
  } | null;
  createdBy: {
    name: string;
  };
}

export default function ProcurementTrackingPage() {
  const queryClient = useQueryClient();
  const [receivingId, setReceivingId] = useState<string | null>(null);

  // 1. Fetch data profil user untuk mengecek role
  const { data: profileRes, isLoading: loadingProfile } = useQuery<{ id: string; name: string; email: string; role: string }>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Gagal mengambil profil.");
      const json = await res.json();
      return json.data;
    }
  });

  // 2. Fetch data list PO untuk pelacakan
  const { data: trackingRes, isLoading: loadingPOs, error } = useQuery({
    queryKey: ["procurement-tracking-list"],
    queryFn: () => getPurchaseOrdersForTracking(),
    refetchOnWindowFocus: true
  });

  const userRole = profileRes?.role;
  const isGudangOrAdmin = userRole === "GUDANG" || userRole === "SUPERADMIN";

  const handleReceive = async (poId: string, poNumber: string) => {
    setReceivingId(poId);
    try {
      const res = await receivePurchaseOrder(poId);
      if (res.success) {
        toast.success(`Barang untuk PO ${poNumber} berhasil diterima. Stok inventaris telah ditambahkan!`);
        // Invalidate dan update data instan
        queryClient.invalidateQueries({ queryKey: ["procurement-tracking-list"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-live-stats"] });
      } else {
        toast.error(res.message || "Gagal memproses penerimaan barang.");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem saat menerima barang.");
    } finally {
      setReceivingId(null);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_APPROVAL":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-250/50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase dark:bg-amber-950/20 dark:text-amber-400">
            <Clock className="h-3 w-3 animate-pulse" />
            Menunggu Persetujuan
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-250/50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase dark:bg-blue-950/20 dark:text-blue-400">
            <Truck className="h-3 w-3" />
            Sedang Dipesan / Dikirim
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-250/50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase dark:bg-rose-950/20 dark:text-rose-400">
            <XCircle className="h-3 w-3" />
            Ditolak Manager
          </span>
        );
      case "RECEIVED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-250/50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase dark:bg-emerald-950/20 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Sudah Sampai Gudang
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
            {status}
          </span>
        );
    }
  };

  if (loadingProfile || loadingPOs) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        <p className="text-sm text-slate-500 font-medium">Memuat pelacakan pengadaan...</p>
      </div>
    );
  }

  if (error || !trackingRes?.success || !trackingRes.data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center p-6 bg-red-50/50 border border-red-100 rounded-2xl">
        <AlertTriangle className="h-12 w-12 text-red-600 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Gagal Memuat Data Pelacakan</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md">
          {trackingRes?.message || "Koneksi database terputus atau gagal memproses data."}
        </p>
      </div>
    );
  }

  const poList = trackingRes.data as POTrackingItem[];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Halaman */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">
          Pelacakan Pengadaan (Procurement Tracking)
        </h1>
        <p className="text-slate-500 text-sm">
          Pantau status pemesanan barang dari divisi Purchasing ke Manager hingga tiba di Gudang untuk penambahan stok otomatis.
        </p>
      </div>

      {/* Rincian Alur Transparansi */}
      <Card className="border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-[#0B132B] flex items-center gap-2">
            <PackageOpen className="h-5 w-5 text-indigo-650" />
            Daftar Antrean Transaksi Pengadaan Barang
          </CardTitle>
          <CardDescription className="text-slate-550 text-xs">
            Orang Gudang dapat melacak apakah barang kritis sedang menunggu persetujuan manager, dalam proses pengiriman, atau siap diterima.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {poList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <FileText className="h-12 w-12 text-slate-400 stroke-1 mb-2" />
              <h4 className="font-bold text-slate-800">Belum Ada Pengadaan</h4>
              <p className="text-xs text-slate-550 max-w-sm">
                Belum ada transaksi pengadaan barang (Purchase Order) yang diajukan oleh staf purchasing.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAF9F5]/90 text-[#0B132B] dark:bg-slate-900 dark:text-slate-300 font-bold border-b border-slate-200/80 dark:border-slate-850 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Nomor PO</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Barang yang Dipesan</th>
                    <th className="px-4 py-3 text-right">Kuantitas</th>
                    <th className="px-4 py-3 text-right">Estimasi Biaya</th>
                    <th className="px-4 py-3">Status Pengadaan</th>
                    <th className="px-4 py-3 text-center">Konfirmasi Gudang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white/40">
                  {poList.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-900/40 transition-colors">
                      {/* Nomor PO */}
                      <td className="px-4 py-3 font-mono font-bold text-[#0B132B] dark:text-white whitespace-nowrap">
                        {po.poNumber}
                      </td>

                      {/* Supplier */}
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-250">
                        {po.supplier.name}
                      </td>

                      {/* Barang */}
                      <td className="px-4 py-3">
                        {po.product ? (
                          <div>
                            <div className="font-bold text-slate-900 dark:text-zinc-100">{po.product.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{po.product.sku}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Umum (Tanpa Relasi Produk)</span>
                        )}
                      </td>

                      {/* Qty */}
                      <td className="px-4 py-3 text-right font-extrabold text-slate-855 dark:text-slate-300">
                        {po.product ? `${po.quantity} Pcs` : "-"}
                      </td>

                      {/* Biaya */}
                      <td className="px-4 py-3 text-right font-extrabold text-[#0B132B] dark:text-teal-400">
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0
                        }).format(po.totalCost)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderStatusBadge(po.status)}
                        {po.status === "REJECTED" && po.managerNotes && (
                          <div className="text-[10px] text-rose-500 font-medium mt-1 max-w-[200px] truncate" title={po.managerNotes}>
                            Catatan: {po.managerNotes}
                          </div>
                        )}
                      </td>

                      {/* Konfirmasi Terima */}
                      <td className="px-4 py-3 text-center">
                        {po.status === "APPROVED" && (
                          <div className="flex justify-center">
                            <Button
                              size="sm"
                              disabled={receivingId !== null || !isGudangOrAdmin}
                              onClick={() => handleReceive(po.id, po.poNumber)}
                              className="h-7.5 px-3 bg-emerald-650 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title={!isGudangOrAdmin ? "Hanya dapat dikonfirmasi oleh Gudang/Admin" : "Konfirmasi kedatangan barang"}
                            >
                              {receivingId === po.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Terima Barang
                            </Button>
                          </div>
                        )}
                        {po.status === "RECEIVED" && (
                          <span className="text-[11px] text-slate-400 font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Stok Terisi
                          </span>
                        )}
                        {po.status === "PENDING_APPROVAL" && (
                          <span className="text-[11px] text-slate-400 font-semibold italic">
                            Menunggu Approval
                          </span>
                        )}
                        {po.status === "REJECTED" && (
                          <span className="text-[11px] text-slate-400 font-semibold italic">
                            Batal / Ditolak
                          </span>
                        )}
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
  );
}

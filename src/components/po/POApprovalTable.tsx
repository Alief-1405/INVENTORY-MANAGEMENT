"use client";

import React, { useState } from "react";
import { Check, X, Loader2, AlertTriangle, FileText, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { approvePurchaseOrder, rejectPurchaseOrder } from "@/app/actions/purchase-order";
import { useQueryClient } from "@tanstack/react-query";

interface PO {
  id: string;
  poNumber: string;
  status: string;
  totalCost: number;
  managerNotes: string | null;
  supplierId: string;
  createdById: string;
  approvedById: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: {
    name: string;
  };
  createdBy: {
    name: string;
  };
}

interface POApprovalTableProps {
  initialPOs: PO[];
  userRole?: string;
}

export default function POApprovalTable({ initialPOs, userRole }: POApprovalTableProps) {
  const queryClient = useQueryClient();
  const [pos, setPOs] = useState<PO[]>(initialPOs);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // State untuk modal penolakan
  const [rejectPoId, setRejectPoId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const isManagerOrAdmin = userRole === "MANAGER" || userRole === "SUPERADMIN";

  const handleApprove = async (id: string, poNumber: string) => {
    setLoadingId(id);
    try {
      const res = await approvePurchaseOrder(id);
      if (res.success) {
        toast.success(`Purchase Order ${poNumber} berhasil disetujui.`);
        setPOs((prev) => prev.filter((po) => po.id !== id));
        queryClient.invalidateQueries({ queryKey: ["dashboard-live-stats"] });
      } else {
        toast.error(res.message || "Gagal menyetujui Purchase Order.");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleOpenRejectModal = (id: string) => {
    setRejectPoId(id);
    setNotes("");
  };

  const handleReject = async () => {
    if (!rejectPoId) return;
    if (!notes.trim()) {
      toast.error("Catatan penolakan harus diisi.");
      return;
    }

    setRejecting(true);
    const targetPo = pos.find((po) => po.id === rejectPoId);
    try {
      const res = await rejectPurchaseOrder(rejectPoId, notes);
      if (res.success) {
        toast.success(`Purchase Order ${targetPo?.poNumber} berhasil ditolak.`);
        setPOs((prev) => prev.filter((po) => po.id !== rejectPoId));
        setRejectPoId(null);
        setNotes("");
        queryClient.invalidateQueries({ queryKey: ["dashboard-live-stats"] });
      } else {
        toast.error(res.message || "Gagal menolak Purchase Order.");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-4">
      {pos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center bg-white/50 dark:bg-zinc-900/50 border border-slate-200/50 dark:border-zinc-800/50 rounded-2xl p-8 space-y-3">
          <FileText className="h-12 w-12 text-slate-400 stroke-1" />
          <h3 className="font-bold text-slate-800 dark:text-zinc-200">Antrean Kosong</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Saat ini tidak ada dokumen Purchase Order yang berstatus menunggu persetujuan (PENDING_APPROVAL).
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-zinc-800/60 bg-white/50 backdrop-blur-md shadow-md">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FAF9F5]/90 text-[#0B132B] dark:bg-zinc-950 dark:text-slate-300 font-bold border-b border-slate-200/80 dark:border-zinc-800 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Nomor PO</th>
                <th className="px-5 py-4">Supplier</th>
                <th className="px-5 py-4 text-right">Total Biaya</th>
                <th className="px-5 py-4">Diajukan Oleh</th>
                <th className="px-5 py-4">Tanggal Pengajuan</th>
                <th className="px-5 py-4 text-center">Aksi Persetujuan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white/30">
              {pos.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-900/40 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {po.poNumber}
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-800 dark:text-zinc-200">
                    {po.supplier.name}
                  </td>
                  <td className="px-5 py-4 text-right font-extrabold text-[#0B132B] dark:text-teal-400">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0
                    }).format(po.totalCost)}
                  </td>
                  <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                    <span className="flex items-center gap-1.5 font-medium">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {po.createdBy.name}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(po.createdAt).toLocaleDateString("id-ID", {
                        dateStyle: "medium"
                      })}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        disabled={loadingId !== null || !isManagerOrAdmin}
                        onClick={() => handleApprove(po.id, po.poNumber)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 px-3 rounded-lg shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title={!isManagerOrAdmin ? "Hanya dapat disetujui oleh Manager/Admin" : "Setujui Dokumen"}
                      >
                        {loadingId === po.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Setujui
                      </Button>
                      <Button
                        size="sm"
                        disabled={loadingId !== null || !isManagerOrAdmin}
                        onClick={() => handleOpenRejectModal(po.id)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-8 px-3 rounded-lg shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title={!isManagerOrAdmin ? "Hanya dapat ditolak oleh Manager/Admin" : "Tolak Dokumen"}
                      >
                        <X className="h-3.5 w-3.5" />
                        Tolak
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Popup Penolakan PO (Custom Tailwind Glassmorphism) */}
      {rejectPoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/20 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Alasan Penolakan PO</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Harap masukkan catatan atau alasan mengapa dokumen pengadaan barang ini ditolak.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="modal-notes" className="text-xs font-bold text-slate-600 dark:text-zinc-400">Catatan Manager</label>
              <textarea
                id="modal-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Total biaya melebihi anggaran bulanan, atau harga supplier terlalu mahal."
                rows={4}
                className="w-full p-3 text-xs bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-850 focus:border-[#0B132B] focus:ring-4 focus:ring-[#0B132B]/10 rounded-xl outline-none transition-all resize-none text-slate-800 dark:text-zinc-200 font-semibold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-900">
              <Button
                variant="ghost"
                disabled={rejecting}
                onClick={() => setRejectPoId(null)}
                className="font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-900 py-2 px-4 rounded-xl cursor-pointer"
              >
                Batal
              </Button>
              <Button
                disabled={rejecting || !notes.trim()}
                onClick={handleReject}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl cursor-pointer shadow-md disabled:opacity-50"
              >
                {rejecting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Menolak...
                  </span>
                ) : (
                  "Kirim Penolakan"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

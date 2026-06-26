"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import { FileSpreadsheet, FileText, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Loader2, ShoppingCart } from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

import { getProducts, getCriticalProducts } from "@/app/actions/product"
import { createStockMovement, getStockMovements } from "@/app/actions/stock"
import { getSalesOrders } from "@/app/actions/sales"

const formSchema = z.object({
  productId: z.string().min(1, "Produk wajib dipilih"),
  type: z.enum(["IN", "OUT", "TRANSFER"]),
  quantity: z.number().int().positive("Kuantitas harus lebih dari 0"),
  reason: z.string().optional().nullable(),
})

export default function MovementsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 1. Query data profil user untuk mengecek role
  const { data: profileRes, isLoading: loadingProfile } = useQuery<{ id: string; name: string; role: string }>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Gagal mengambil profil.");
      const json = await res.json();
      return json.data;
    }
  });

  const isSales = profileRes?.role === "SALES";

  // 2. Query data Sales Orders khusus untuk role SALES
  const { data: salesOrdersRes, isLoading: salesOrdersLoading } = useQuery({
    queryKey: ["sales-orders-list"],
    queryFn: () => getSalesOrders(),
    enabled: isSales // Hanya jalankan jika user adalah SALES
  });

  const salesOrders = salesOrdersRes?.success && salesOrdersRes.data ? salesOrdersRes.data : [];

  // Query data produk untuk log mutasi normal
  const { data: productsRes, isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts(),
    enabled: !isSales
  })
  const products = productsRes?.data || []

  // Query data riwayat mutasi normal
  const { data: movementsRes, isLoading: movementsLoading, refetch: refetchMovements } = useQuery({
    queryKey: ["movements"],
    queryFn: () => getStockMovements(),
    enabled: !isSales
  })
  const movements = movementsRes?.data || []

  const isPurchasing = profileRes?.role === "PURCHASING"
  const isManager = profileRes?.role === "MANAGER"
  const isReadOnlyRole = isPurchasing || isManager
  const [activeTab, setActiveTab] = useState<"all" | "restock">("all")

  // Query data produk kritis khusus untuk role PURCHASING
  const { data: criticalProductsRes, isLoading: criticalProductsLoading, refetch: refetchCriticalProducts } = useQuery({
    queryKey: ["critical-products"],
    queryFn: () => getCriticalProducts(),
    enabled: isPurchasing
  })
  const criticalProducts = criticalProductsRes?.data || []

  // State filter Manager
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IN" | "OUT" | "TRANSFER">("ALL")
  const [operatorFilter, setOperatorFilter] = useState("ALL")

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: "",
      type: "IN",
      quantity: 1,
      reason: ""
    },
  })

  const getSourceDoc = (reason: string, type: string) => {
    if (!reason) return null;
    if (type === "IN" && (reason.includes("PO ") || reason.includes("PO-") || reason.toLowerCase().includes("po-"))) {
      const match = reason.match(/PO-[0-9-]+/i);
      return { type: "PO", name: match ? match[0].toUpperCase() : "Purchase Order" };
    }
    if (type === "OUT" && (reason.includes("SO ") || reason.includes("SO-") || reason.toLowerCase().includes("so-"))) {
      const match = reason.match(/SO-[0-9-]+/i);
      return { type: "SO", name: match ? match[0].toUpperCase() : "Sales Order" };
    }
    return null;
  };

  // Filtered movements for Manager audit view
  const filteredMovements = movements.filter((m: any) => {
    const matchesType = typeFilter === "ALL" || m.type === typeFilter;
    const matchesOperator = operatorFilter === "ALL" || (m.user?.name || "") === operatorFilter;
    return matchesType && matchesOperator;
  });

  const displayMovements = isManager ? filteredMovements : movements;

  const uniqueOperators = Array.from(
    new Set(movements.map((m: any) => m.user?.name).filter(Boolean))
  ) as string[];

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      const res = await createStockMovement(values)
      if (res.success) {
        toast.success("Mutasi stok berhasil dicatat!")
        form.reset({
          productId: "",
          type: "IN",
          quantity: 1,
          reason: ""
        })
        refetchMovements()
        refetchProducts()
      } else {
        toast.error(res.message || "Gagal mencatat mutasi")
      }
    } catch (e) {
      toast.error("Terjadi kesalahan sistem")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExportExcel = () => {
    const dataToExport = displayMovements;
    if (dataToExport.length === 0) {
      toast.error("Tidak ada data untuk diekspor.")
      return
    }

    const worksheetData = dataToExport.map((m: any) => ({
      "Tanggal": new Date(m.createdAt).toLocaleString("id-ID"),
      "SKU": m.product?.sku || "-",
      "Nama Produk": m.product?.name || "-",
      "Tipe": m.type === "IN" ? "Masuk" : m.type === "OUT" ? "Keluar" : "Transfer",
      "Kuantitas": m.quantity,
      "Alasan/Catatan": m.reason || "-",
      "Operator/User": m.user?.name || "-",
    }))

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Mutasi Stok")
    
    const dateStr = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `Laporan_Mutasi_Stok_${dateStr}.xlsx`)
    toast.success("Laporan Excel berhasil diunduh!")
  }

  const handleExportPDF = () => {
    const dataToExport = displayMovements;
    if (dataToExport.length === 0) {
      toast.error("Tidak ada data untuk diekspor.")
      return
    }

    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text("LAPORAN MUTASI STOK BARANG", 14, 15)
    doc.setFontSize(10)
    doc.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, 14, 22)

    const tableColumn = ["Tanggal", "SKU", "Nama Produk", "Tipe", "Qty", "Alasan/Catatan", "Operator"]
    const tableRows = dataToExport.map((m: any) => [
      new Date(m.createdAt).toLocaleString("id-ID"),
      m.product?.sku || "-",
      m.product?.name || "-",
      m.type,
      m.quantity.toString(),
      m.reason || "-",
      m.user?.name || "-",
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 8.5, cellPadding: 2 },
    })

    const dateStr = new Date().toISOString().slice(0, 10)
    doc.save(`Laporan_Mutasi_Stok_${dateStr}.pdf`)
    toast.success("Laporan PDF berhasil diunduh!")
  }

  if (loadingProfile || (isSales && salesOrdersLoading)) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-teal-650" />
        <p className="text-sm text-slate-500 font-medium">Memuat halaman riwayat...</p>
      </div>
    );
  }

  if (isSales) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">
            Riwayat Transaksi
          </h1>
          <p className="text-slate-505 text-sm">
            Pantau status pembayaran pelanggan dan status pengemasan barang oleh divisi Gudang.
          </p>
        </div>

        <Card className="border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#0B132B] dark:text-zinc-150">Daftar Dokumen Penjualan</CardTitle>
            <CardDescription className="text-slate-550 text-xs">Menampilkan seluruh riwayat transaksi SO yang telah Anda buat.</CardDescription>
          </CardHeader>
          <CardContent>
            {salesOrders.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-zinc-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
                <ShoppingCart className="h-8 w-8 text-slate-350 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800 dark:text-zinc-200">Belum Ada Transaksi</h4>
                <p className="text-slate-500 mt-0.5">Belum ada riwayat Sales Order yang tercatat untuk Anda.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-zinc-850 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#FAF9F5]/90 text-[#0B132B] dark:bg-zinc-900 dark:text-slate-350 font-bold border-b border-slate-150 dark:border-zinc-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">No. SO</th>
                      <th className="px-4 py-3">Pelanggan</th>
                      <th className="px-4 py-3">Nama Produk</th>
                      <th className="px-4 py-3 text-right">QTY</th>
                      <th className="px-4 py-3 text-right">Total Tagihan</th>
                      <th className="px-4 py-3 text-center">Metode</th>
                      <th className="px-4 py-3 text-center">Status Transaksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white/30">
                    {salesOrders.map((so: any) => (
                      <tr key={so.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-zinc-300">{so.soNumber}</td>
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-zinc-200">{so.customerName}</td>
                        <td className="px-4 py-3 font-semibold text-slate-600 dark:text-zinc-400">{so.product?.name || "-"}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-750 dark:text-zinc-300 font-mono">{so.quantity} Pcs</td>
                        <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-zinc-100">
                          {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(so.totalPrice)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {so.paymentMethod ? (
                            <span className="font-semibold text-slate-550 dark:text-zinc-400 uppercase">{so.paymentMethod}</span>
                          ) : (
                            <span className="text-slate-400 font-medium italic">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {so.status === "PENDING_PAYMENT" ? (
                            <span className="inline-flex items-center rounded-full bg-red-50 text-red-800 border border-red-200/50 px-2.5 py-0.5 text-[9px] font-extrabold uppercase dark:bg-red-950/20 dark:text-red-400">
                              Menunggu Pembayaran
                            </span>
                          ) : so.status === "PAID" ? (
                            <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-800 border border-blue-200/50 px-2.5 py-0.5 text-[9px] font-extrabold uppercase dark:bg-blue-950/20 dark:text-blue-400 animate-pulse">
                              Lunas, Menunggu Gudang
                            </span>
                          ) : so.status === "CANCELLED" ? (
                            <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-0.5 text-[9px] font-extrabold uppercase dark:bg-zinc-800 dark:text-zinc-400">
                              Dibatalkan
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-250 px-2.5 py-0.5 text-[9px] font-extrabold uppercase dark:bg-emerald-950/20 dark:text-emerald-450">
                              Selesai Dikirim
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">
            {isPurchasing 
              ? "Pemantauan & Analisis Stok" 
              : isManager 
                ? "Audit Log Mutasi Stok" 
                : "Mutasi Stok"}
          </h1>
          <p className="text-slate-500 text-sm">
            {isPurchasing
              ? "Pantau ketersediaan stok produk dan kelola rekomendasi restock untuk mencegah kehabisan persediaan."
              : isManager
                ? "Audit dan pantau seluruh pergerakan keluar-masuk stok barang secara real-time."
                : "Catat dan pantau seluruh pergerakan keluar-masuk stok produk."}
          </p>
        </div>
        {!isPurchasing && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportExcel}
              className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Ekspor Excel
            </Button>
            <Button
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-[#0B132B] hover:bg-[#1C2541] text-white font-bold px-4 py-2 text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <FileText className="h-4 w-4 text-teal-400" />
              Unduh PDF
            </Button>
          </div>
        )}
      </div>

      {isPurchasing && (
        <div className="flex border-b border-slate-200 dark:border-zinc-800 gap-6 text-sm font-semibold mb-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`pb-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "all"
                ? "border-indigo-650 text-indigo-650 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-855 dark:hover:text-zinc-300"
            }`}
          >
            Semua Pergerakan Stok
          </button>
          <button
            onClick={() => setActiveTab("restock")}
            className={`pb-2 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "restock"
                ? "border-indigo-650 text-indigo-650 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-855 dark:hover:text-zinc-300"
            }`}
          >
            <span>Rekomendasi Restock</span>
            {criticalProducts.length > 0 && (
              <span className="inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-bold h-5 px-1.5 rounded-full animate-pulse">
                {criticalProducts.length}
              </span>
            )}
          </button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {!isReadOnlyRole && (
          <Card className="border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-[#0B132B] dark:text-zinc-150">Catat Pergerakan Stok</CardTitle>
              <CardDescription className="text-slate-555 text-xs">Pilih barang dan jenis mutasi untuk mengubah jumlah stok gudang secara riil.</CardDescription>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                </div>
              ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="productId" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pilih Produk</Label>
                    <Select value={form.watch("productId") || undefined} onValueChange={(val) => form.setValue("productId", val as string)}>
                      <SelectTrigger className="bg-white/80 dark:bg-zinc-950 border-slate-200/80 rounded-xl text-xs font-semibold">
                        <span className="flex flex-1 text-left truncate" data-slot="select-value">
                          {form.watch("productId") && products.find((p: any) => p.id === form.watch("productId"))
                            ? `[${products.find((p: any) => p.id === form.watch("productId"))?.sku}] - ${products.find((p: any) => p.id === form.watch("productId"))?.name}`
                            : <span className="text-slate-500">-- Pilih Produk --</span>}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {`[${p.sku}] - ${p.name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-zinc-800 text-xs">
                    {(() => {
                      const selectedProductId = form.watch("productId");
                      const selectedProduct = products.find((p: any) => p.id === selectedProductId);
                      if (selectedProduct) {
                        return (
                          <div className="space-y-1 text-slate-700 dark:text-zinc-300">
                            <div className="flex justify-between">
                              <span className="font-semibold text-slate-500">SKU:</span>
                              <span className="font-bold">{selectedProduct.sku}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-semibold text-slate-500">Nama Produk:</span>
                              <span className="font-bold">{selectedProduct.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-semibold text-slate-500">Stok Saat Ini:</span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedProduct.stock}</span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="text-center text-slate-400 italic py-1">
                          Silakan pilih produk
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="type" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Jenis Mutasi</Label>
                    <Select value={form.watch("type")} onValueChange={(val: any) => form.setValue("type", val)}>
                      <SelectTrigger className="bg-white/80 dark:bg-zinc-950 border-slate-200/80 rounded-xl text-xs font-semibold">
                        <SelectValue placeholder="-- Tipe --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IN">Stok Masuk (IN)</SelectItem>
                        <SelectItem value="OUT">Stok Keluar (OUT)</SelectItem>
                        <SelectItem value="TRANSFER">Stok Transfer (TRANSFER)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="quantity" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Jumlah Kuantitas</Label>
                    <Input
                      id="quantity"
                      type="number"
                      {...form.register("quantity", { valueAsNumber: true })}
                      className="bg-white/80 dark:bg-zinc-950 border-slate-200/80 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reason" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Alasan / Catatan</Label>
                    <Input
                      id="reason"
                      placeholder="Contoh: Stok opname bulanan"
                      {...form.register("reason")}
                      className="bg-white/80 dark:bg-zinc-950 border-slate-200/80 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#0B132B] hover:bg-[#1C2541] text-white text-xs font-bold py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Catat Mutasi Stok
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        <Card className={`${isReadOnlyRole ? "md:col-span-3" : "md:col-span-2"} border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm`}>
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#0B132B] dark:text-zinc-150">
              {activeTab === "restock" ? "Rekomendasi Restock Barang" : "Riwayat Mutasi Stok Gudang"}
            </CardTitle>
            <CardDescription className="text-slate-550 text-xs">
              {activeTab === "restock"
                ? "Daftar produk dengan persediaan saat ini kritis (di bawah atau sama dengan batas minimum stok)."
                : "Seluruh log pergerakan stok dicatat di bawah demi audit persediaan yang transparan."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isManager && activeTab === "all" && (
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-5 p-3 rounded-xl bg-slate-50/50 dark:bg-zinc-900/30 border border-slate-100 dark:border-zinc-800">
                <div className="w-full sm:w-48 space-y-1">
                  <Label className="text-[10px] font-bold text-slate-550 dark:text-zinc-400 uppercase tracking-wide">Tipe Mutasi</Label>
                  <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val || "ALL")}>
                    <SelectTrigger className="bg-white dark:bg-zinc-950 border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-200 h-9">
                      <SelectValue placeholder="Semua Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Tipe</SelectItem>
                      <SelectItem value="IN">Stok Masuk (IN)</SelectItem>
                      <SelectItem value="OUT">Stok Keluar (OUT)</SelectItem>
                      <SelectItem value="TRANSFER">Stok Transfer (TRANSFER)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full sm:w-56 space-y-1">
                  <Label className="text-[10px] font-bold text-slate-555 dark:text-zinc-400 uppercase tracking-wide">Operator / Staff</Label>
                  <Select value={operatorFilter} onValueChange={(val) => setOperatorFilter(val || "ALL")}>
                    <SelectTrigger className="bg-white dark:bg-zinc-950 border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-200 h-9">
                      <SelectValue placeholder="Semua Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Operator</SelectItem>
                      {uniqueOperators.map((op) => (
                        <SelectItem key={op} value={op}>{op}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {activeTab === "restock" ? (
              criticalProductsLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                </div>
              ) : criticalProducts.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
                  Semua produk memiliki jumlah stok yang aman.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-zinc-850 shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#FAF9F5]/90 text-[#0B132B] dark:bg-zinc-900 dark:text-slate-350 font-bold border-b border-slate-150 dark:border-zinc-800 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Produk</th>
                        <th className="px-4 py-3 text-center">Stok Saat Ini</th>
                        <th className="px-4 py-3 text-center">Stok Minimum</th>
                        <th className="px-4 py-3 text-right">Estimasi Biaya (50 Pcs)</th>
                        <th className="px-4 py-3">Supplier</th>
                        <th className="px-4 py-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white/30">
                      {criticalProducts.map((p: any) => {
                        const estCost = (p.buyPrice || 0) * 50;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-zinc-150">
                              {p.name}
                              <div className="text-[9px] font-mono text-slate-400 mt-0.5">SKU: {p.sku}</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center rounded-full bg-red-50 text-red-800 border border-red-200 px-2.5 py-0.5 text-xs font-bold dark:bg-red-950/20 dark:text-red-400">
                                {p.stock} Pcs
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-slate-500 font-semibold">
                              {p.minStock} Pcs
                            </td>
                            <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-zinc-100">
                              {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(estCost)}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-650 dark:text-zinc-400">
                              {p.supplier?.name || "-"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <a
                                href={`/purchase-orders?productId=${p.id}&amount=${estCost}&supplierId=${p.supplierId || ""}`}
                                className="inline-flex items-center gap-1 bg-[#0B132B] hover:bg-[#1C2541] text-white font-bold px-3 py-1.5 text-[10px] rounded-xl shadow-xs transition-all cursor-pointer"
                              >
                                + Buat PO Baru
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : movementsLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : displayMovements.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed">
                Tidak ada data mutasi stok ditemukan.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-zinc-850 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#FAF9F5]/90 text-[#0B132B] dark:bg-slate-900 dark:text-slate-350 font-bold border-b border-slate-150 dark:border-zinc-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Produk</th>
                      <th className="px-4 py-3 text-center">Tipe</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-center">Dokumen Sumber</th>
                      <th className="px-4 py-3">Catatan</th>
                      <th className="px-4 py-3">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white/30">
                    {displayMovements.map((m: any) => {
                      const doc = getSourceDoc(m.reason || "", m.type);
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                          <td className="px-4 py-3 text-slate-450 font-semibold">{new Date(m.createdAt).toLocaleString("id-ID")}</td>
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-zinc-150">
                            {m.product?.name || "-"}
                            <div className="text-[9px] font-mono text-slate-400 mt-0.5">SKU: {m.product?.sku || "-"}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {m.type === "IN" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-250 px-2 py-0.5 text-[9px] font-extrabold uppercase">
                                <ArrowDownLeft className="h-3 w-3" />
                                Masuk
                              </span>
                            ) : m.type === "OUT" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-800 border border-red-250 px-2 py-0.5 text-[9px] font-extrabold uppercase">
                                <ArrowUpRight className="h-3 w-3" />
                                Keluar
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-800 border border-blue-250 px-2 py-0.5 text-[9px] font-extrabold uppercase">
                                <ArrowLeftRight className="h-3 w-3" />
                                Transfer
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-slate-800 dark:text-zinc-200 font-mono">{m.quantity} Pcs</td>
                          <td className="px-4 py-3 text-center">
                            {doc ? (
                              doc.type === "PO" ? (
                                <span className="inline-flex items-center rounded bg-blue-55 text-blue-800 border border-blue-200 px-2 py-0.5 text-[10px] font-bold uppercase dark:bg-blue-950/20 dark:text-blue-400">
                                  {doc.name}
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded bg-indigo-55 text-indigo-800 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold uppercase dark:bg-indigo-950/20 dark:text-indigo-400">
                                  {doc.name}
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 font-semibold italic">Opname Manual</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-550 dark:text-zinc-400 font-medium max-w-xs truncate" title={m.reason}>{m.reason || "-"}</td>
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-zinc-200">{m.user?.name || "-"}</td>
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
    </div>
  )
}

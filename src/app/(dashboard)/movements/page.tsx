"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import { FileSpreadsheet, FileText, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Loader2 } from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

import { getProducts } from "@/app/actions/product"
import { createStockMovement, getStockMovements } from "@/app/actions/stock"

const formSchema = z.object({
  productId: z.string().min(1, "Produk wajib dipilih"),
  type: z.enum(["IN", "OUT", "TRANSFER"]),
  quantity: z.number().int().positive("Kuantitas harus lebih dari 0"),
  reason: z.string().optional().nullable(),
})

export default function MovementsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Query data produk
  const { data: productsRes, isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts(),
  })
  const products = productsRes?.data || []

  // Query data riwayat mutasi
  const { data: movementsRes, isLoading: movementsLoading, refetch: refetchMovements } = useQuery({
    queryKey: ["movements"],
    queryFn: () => getStockMovements(),
  })
  const movements = movementsRes?.data || []

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "IN",
      quantity: 1,
      reason: ""
    },
  })

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
        // Refresh data produk dan mutasi
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

  // Fungsi Ekspor Excel
  const handleExportExcel = () => {
    if (movements.length === 0) {
      toast.error("Tidak ada data untuk diekspor.")
      return
    }

    const worksheetData = movements.map((m: any) => ({
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
    
    // Set format kolom agar rapi
    const dateStr = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `Laporan_Mutasi_Stok_${dateStr}.xlsx`)
    toast.success("Laporan Excel berhasil diunduh!")
  }

  // Fungsi Ekspor PDF
  const handleExportPDF = () => {
    if (movements.length === 0) {
      toast.error("Tidak ada data untuk diekspor.")
      return
    }

    const doc = new jsPDF()
    
    // Judul & Header Laporan
    doc.setFontSize(18)
    doc.text("LAPORAN MUTASI STOK BARANG", 14, 15)
    doc.setFontSize(10)
    doc.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, 14, 22)

    const tableColumn = ["Tanggal", "SKU", "Nama Produk", "Tipe", "Qty", "Alasan/Catatan", "Operator"]
    const tableRows = movements.map((m: any) => [
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
      headStyles: { fillColor: [15, 23, 42] }, // slate-900
      styles: { fontSize: 8.5, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 35 }, // Tanggal
        1: { cellWidth: 20 }, // SKU
        2: { cellWidth: 40 }, // Nama Produk
        3: { cellWidth: 18 }, // Tipe
        4: { cellWidth: 12 }, // Qty
        5: { cellWidth: 40 }, // Alasan
        6: { cellWidth: 25 }, // Operator
      }
    })

    const dateStr = new Date().toISOString().slice(0, 10)
    doc.save(`Laporan_Mutasi_Stok_${dateStr}.pdf`)
    toast.success("Laporan PDF berhasil diunduh!")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">Mutasi Stok</h1>
          <p className="text-slate-500 text-sm">
            Catat dan pantau seluruh pergerakan keluar-masuk stok produk.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportExcel}
            className="border-emerald-600/30 text-emerald-700 bg-white/50 backdrop-blur-md hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/20 font-bold rounded-xl"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF}
            className="border-rose-600/30 text-rose-700 bg-white/50 backdrop-blur-md hover:bg-rose-50 hover:text-rose-800 dark:hover:bg-rose-950/20 font-bold rounded-xl"
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kolom Kiri: Form Catat Mutasi (Glass Box) */}
        <div className="lg:col-span-1">
          <Card className="border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#0B132B]">Catat Pergerakan</CardTitle>
              <CardDescription className="text-slate-500">Masukkan rincian perubahan stok barang di sini.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="productId" className="text-xs font-bold text-slate-650 uppercase tracking-wide">Pilih Produk</Label>
                  <Select onValueChange={(val) => form.setValue("productId", val || "")} value={form.watch("productId") || ""}>
                    <SelectTrigger id="productId" className="bg-white/50 dark:bg-zinc-900 border-slate-200/80 rounded-xl text-sm font-semibold">
                      <SelectValue placeholder={productsLoading ? "Memuat..." : "Pilih Produk"}>
                        {form.watch("productId") 
                          ? products.find((p: any) => p.id === form.watch("productId"))?.sku 
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.sku} - {p.name} (Stok: {p.stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.productId && (
                    <p className="text-xs text-rose-500 font-medium">{form.formState.errors.productId.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-xs font-bold text-slate-650 uppercase tracking-wide">Tipe Mutasi</Label>
                    <Select defaultValue="IN" onValueChange={(val: any) => form.setValue("type", val)} value={form.watch("type")}>
                      <SelectTrigger id="type" className="bg-white/50 dark:bg-zinc-900 border-slate-200/80 rounded-xl text-sm font-semibold">
                        <SelectValue placeholder="Tipe Mutasi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IN">Masuk (IN)</SelectItem>
                        <SelectItem value="OUT">Keluar (OUT)</SelectItem>
                        <SelectItem value="TRANSFER">Transfer (TRANSFER)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-xs font-bold text-slate-655 uppercase tracking-wide">Kuantitas</Label>
                    <Input 
                      id="quantity" 
                      type="number" 
                      min="1" 
                      {...form.register("quantity", { valueAsNumber: true })} 
                      className="bg-white/50 dark:bg-zinc-900 border-slate-200/80 rounded-xl"
                    />
                    {form.formState.errors.quantity && (
                      <p className="text-xs text-rose-500 font-medium">{form.formState.errors.quantity.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-xs font-bold text-slate-655 uppercase tracking-wide">Alasan / Catatan</Label>
                  <Input 
                    id="reason" 
                    placeholder="Contoh: Restock bulanan / Retur barang / Opname" 
                    {...form.register("reason")} 
                    className="bg-white/50 dark:bg-zinc-900 border-slate-200/80 rounded-xl"
                  />
                  {form.formState.errors.reason && (
                    <p className="text-xs text-rose-500 font-medium">{form.formState.errors.reason.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full bg-[#0B132B] hover:bg-[#1C2541] active:bg-[#0B132B] text-white font-bold rounded-xl shadow-lg transition-all py-5 mt-2 cursor-pointer" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-teal-400" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Mutasi"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Tabel Riwayat Mutasi (Glass Box) */}
        <div className="lg:col-span-2">
          <Card className="border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden h-full">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#0B132B]">Riwayat Pergerakan Stok</CardTitle>
              <CardDescription className="text-slate-550">Semua riwayat keluar-masuk barang yang tercatat pada sistem.</CardDescription>
            </CardHeader>
            <CardContent>
              {movementsLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0B132B]" />
                </div>
              ) : movements.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center text-center text-muted-foreground bg-slate-50/50 rounded-xl border border-dashed">
                  <p className="font-semibold">Belum ada riwayat mutasi</p>
                  <p className="text-xs">Mutasi stok yang dicatat akan tampil di sini.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-[#FAF9F5]/80 text-xs font-bold uppercase text-[#0B132B] dark:bg-slate-900 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3">Produk</th>
                        <th className="px-4 py-3">Tipe</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3">Alasan/Catatan</th>
                        <th className="px-4 py-3">Operator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white/40 text-xs">
                      {movements.map((m: any) => (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-slate-500">
                            {new Date(m.createdAt).toLocaleString("id-ID", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {m.product?.name || "Produk dihapus"}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">{m.product?.sku || "-"}</div>
                          </td>
                          <td className="px-4 py-3">
                            {m.type === "IN" && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/50 px-2.5 py-0.5 font-bold shadow-xs">
                                <ArrowDownLeft className="h-3 w-3" />
                                Masuk (IN)
                              </span>
                            )}
                            {m.type === "OUT" && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200/50 px-2.5 py-0.5 font-bold shadow-xs">
                                <ArrowUpRight className="h-3 w-3" />
                                Keluar (OUT)
                              </span>
                            )}
                            {m.type === "TRANSFER" && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200/50 px-2.5 py-0.5 font-bold shadow-xs">
                                <ArrowLeftRight className="h-3 w-3" />
                                Transfer
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-slate-800 dark:text-slate-200">{m.quantity}</td>
                          <td className="px-4 py-3 text-slate-500 font-medium max-w-[150px] truncate" title={m.reason || ""}>
                            {m.reason || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-semibold">{m.user?.name || "Sistem"}</td>
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
    </div>
  )
}

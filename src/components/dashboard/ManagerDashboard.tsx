"use client";

import React from "react";
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  Layers, 
  FileDown, 
  ShieldAlert, 
  Clock, 
  Users,
  Percent,
  Coins
} from "lucide-react";
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
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Premium HSL Colors for Pie Chart
const COLORS = ["#0D9488", "#8B5CF6", "#F59E0B", "#3B82F6", "#EF4444"];

interface AuditLog {
  id: string;
  time: string;
  userName: string;
  role: string;
  action: string;
  details: string;
}

interface ManagerDashboardProps {
  stats: {
    totalProducts: number;
    lowStockCount: number;
    totalAssetValue: number;
    totalCapitalValue: number;
    estimatedProfit: number;
    profitMarginPercent: number;
    recentAuditLogs: AuditLog[];
    categoryComposition: { name: string; value: number }[];
    mutationTrend: { name: string; IN: number; OUT: number }[];
  };
}

export default function ManagerDashboard({ stats }: ManagerDashboardProps) {
  const {
    totalAssetValue,
    totalCapitalValue,
    estimatedProfit,
    profitMarginPercent,
    recentAuditLogs,
    categoryComposition,
    mutationTrend
  } = stats;

  const handleExport = (type: "PDF" | "EXCEL") => {
    toast.info(`Mengekspor laporan ke format ${type}...`);
    try {
      if (type === "EXCEL") {
        const financialSummary = [
          { "Metrik Finansial": "Total Katalog Produk", "Nilai": stats.totalProducts },
          { "Metrik Finansial": "Total Produk Minim Stok (Low Stock)", "Nilai": stats.lowStockCount },
          { "Metrik Finansial": "Total Nilai Aset (Harga Jual)", "Nilai": formatCurrency(stats.totalAssetValue) },
          { "Metrik Finansial": "Modal Tertanam (Harga Beli)", "Nilai": formatCurrency(stats.totalCapitalValue) },
          { "Metrik Finansial": "Estimasi Keuntungan", "Nilai": formatCurrency(stats.estimatedProfit) },
          { "Metrik Finansial": "Margin Keuntungan (%)", "Nilai": `${stats.profitMarginPercent}%` },
        ];

        const auditLogsData = stats.recentAuditLogs.map((log) => ({
          "Waktu": log.time,
          "Nama Karyawan": log.userName,
          "Jabatan/Role": log.role,
          "Aksi": log.action,
          "Detail": log.details,
        }));

        const categoryData = stats.categoryComposition.map((cat) => ({
          "Kategori Produk": cat.name,
          "Persentase Sebaran (%)": `${cat.value}%`,
        }));

        const mutationData = stats.mutationTrend.map((t) => ({
          "Hari/Tanggal": t.name,
          "Barang Masuk (IN)": t.IN,
          "Barang Keluar (OUT)": t.OUT,
        }));

        const workbook = XLSX.utils.book_new();

        const summarySheet = XLSX.utils.json_to_sheet(financialSummary);
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan Finansial");

        const categorySheet = XLSX.utils.json_to_sheet(categoryData);
        XLSX.utils.book_append_sheet(workbook, categorySheet, "Sebaran Kategori");

        const mutationSheet = XLSX.utils.json_to_sheet(mutationData);
        XLSX.utils.book_append_sheet(workbook, mutationSheet, "Tren Mutasi Stok");

        const auditSheet = XLSX.utils.json_to_sheet(auditLogsData);
        XLSX.utils.book_append_sheet(workbook, auditSheet, "Audit Trail");

        const dateStr = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `Laporan_Dashboard_Manager_${dateStr}.xlsx`);
        toast.success("Laporan Excel berhasil diunduh!");
      } else {
        // PDF Export
        const doc = new jsPDF();
        
        // Judul & Header Laporan
        doc.setFontSize(18);
        doc.setTextColor(11, 19, 43); // #0B132B
        doc.text("LAPORAN ANALISIS KEUANGAN & AUDIT TRAIL", 14, 15);
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, 14, 22);

        // Seksi 1: Ringkasan Keuangan
        doc.setFontSize(13);
        doc.setTextColor(11, 19, 43);
        doc.text("1. Ringkasan Finansial Makro", 14, 32);

        const summaryColumns = ["Metrik Finansial", "Nilai (Rupiah / Persen / Unit)"];
        const summaryRows = [
          ["Total Katalog Produk", stats.totalProducts.toString()],
          ["Stok Kritis (Low Stock)", stats.lowStockCount.toString()],
          ["Total Nilai Aset (Harga Jual)", formatCurrency(stats.totalAssetValue)],
          ["Modal Tertanam (Harga Beli)", formatCurrency(stats.totalCapitalValue)],
          ["Estimasi Keuntungan", formatCurrency(stats.estimatedProfit)],
          ["Margin Keuntungan", `+${stats.profitMarginPercent}%`],
        ];

        autoTable(doc, {
          head: [summaryColumns],
          body: summaryRows,
          startY: 36,
          theme: 'grid',
          headStyles: { fillColor: [13, 148, 136] }, // teal-600
          styles: { fontSize: 9.5, cellPadding: 2.5 },
        });

        // Seksi 2: Komposisi Kategori Produk
        let currentY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(13);
        doc.setTextColor(11, 19, 43);
        doc.text("2. Komposisi Kategori Produk", 14, currentY);

        const categoryColumns = ["Kategori Produk", "Persentase Sebaran (%)"];
        const categoryRows = stats.categoryComposition.map(cat => [cat.name, `${cat.value}%`]);

        autoTable(doc, {
          head: [categoryColumns],
          body: categoryRows,
          startY: currentY + 4,
          theme: 'grid',
          headStyles: { fillColor: [139, 92, 246] }, // violet-500
          styles: { fontSize: 9, cellPadding: 2.5 },
        });

        // Seksi 3: Audit Trail / Log Aktivitas
        currentY = (doc as any).lastAutoTable.finalY + 10;
        
        // Cek jika butuh halaman baru
        if (currentY > 210) {
          doc.addPage();
          currentY = 15;
        }

        doc.setFontSize(13);
        doc.setTextColor(11, 19, 43);
        doc.text("3. Audit Trail - Riwayat Aktivitas Karyawan", 14, currentY);

        const auditColumns = ["Waktu", "Nama Karyawan", "Role", "Aksi", "Detail"];
        const auditRows = stats.recentAuditLogs.map(log => [
          log.time,
          log.userName,
          log.role,
          log.action,
          log.details,
        ]);

        autoTable(doc, {
          head: [auditColumns],
          body: auditRows,
          startY: currentY + 4,
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42] }, // slate-900
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 32 },
            2: { cellWidth: 20 },
            3: { cellWidth: 28 },
            4: { cellWidth: 77 },
          }
        });

        const dateStr = new Date().toISOString().slice(0, 10);
        doc.save(`Laporan_Dashboard_Manager_${dateStr}.pdf`);
        toast.success("Laporan PDF berhasil diunduh!");
      }
    } catch (error: any) {
      console.error("Export Error:", error);
      toast.error(`Gagal mengekspor laporan: ${error.message || error}`);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">
            Analisis Keuangan & Log Audit
          </h1>
          <p className="text-slate-500 text-sm">
            Tinjauan makro finansial, arus margin laba, dan riwayat aktivitas operasional gudang (Read-Only).
          </p>
        </div>

        {/* Tombol Ekspor Premium */}
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => handleExport("PDF")}
            className="flex items-center gap-2 bg-[#0B132B] hover:bg-[#1C2541] text-white font-bold px-4 py-2 text-xs rounded-xl shadow-md transition-all duration-300 cursor-pointer"
          >
            <FileDown className="h-4 w-4 text-teal-400" />
            Unduh PDF
          </Button>
          <Button 
            onClick={() => handleExport("EXCEL")}
            className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 text-xs rounded-xl shadow-sm transition-all duration-300 cursor-pointer"
          >
            <FileDown className="h-4 w-4 text-emerald-600" />
            Ekspor Excel
          </Button>
        </div>
      </div>

      {/* Baris Pertama: Kartu Finansial Makro */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Card 1: Nilai Total Aset - Aksen Teal */}
        <Card className="hover:shadow-md transition-all duration-300 border border-white/40 border-l-4 border-l-teal-500 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Nilai Total Aset</CardTitle>
            <div className="rounded-xl bg-teal-50 p-2 dark:bg-teal-950/20 shadow-xs">
              <DollarSign className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">
              {formatCurrency(totalAssetValue)}
            </div>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">
              Estimasi total harga jual seluruh stok produk.
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Modal Tertanam - Aksen Amber */}
        <Card className="hover:shadow-md transition-all duration-300 border border-white/40 border-l-4 border-l-amber-500 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Modal Tertanam</CardTitle>
            <div className="rounded-xl bg-amber-50 p-2 dark:bg-amber-950/20 shadow-xs">
              <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">
              {formatCurrency(totalCapitalValue)}
            </div>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">
              Akumulasi biaya beli (modal) aset di gudang.
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Margin Laba Kotor - Aksen Violet */}
        <Card className="hover:shadow-md transition-all duration-300 border border-white/40 border-l-4 border-l-violet-500 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Margin Keuntungan</CardTitle>
            <div className="rounded-xl bg-violet-50 p-2 dark:bg-violet-950/20 shadow-xs">
              <Percent className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-violet-700 dark:text-violet-400">
                {formatCurrency(estimatedProfit)}
              </span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                +{profitMarginPercent}%
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">
              Potensi margin berdasarkan margin harga modal vs jual.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Baris Kedua: Visualisasi Grafik */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Grafik Batang: Arus Mutasi Barang */}
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
                <Bar dataKey="IN" name="Masuk (IN)" fill="#0D9488" radius={[6, 6, 0, 0]} barSize={16} />
                <Bar dataKey="OUT" name="Keluar (OUT)" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Grafik Lingkaran: Komposisi Kategori */}
        <Card className="lg:col-span-1 border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-[#0B132B] dark:text-zinc-150">
              <Layers className="h-5 w-5 text-purple-650" />
              Komposisi Kategori Produk
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

      {/* Baris Ketiga: Audit Trail / Log Aktivitas Karyawan */}
      <Card className="border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-bold text-[#0B132B] flex items-center gap-2">
              <Clock className="h-5 w-5 text-teal-650" />
              Audit Trail - Log Aktivitas Karyawan
            </CardTitle>
            <CardDescription className="text-slate-555">
              Riwayat tindakan operasional terintegrasi. Mencatat log secara riil demi transparansi operasional.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {recentAuditLogs.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed">
              Belum ada log aktivitas audit yang tercatat.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAF9F5]/80 text-[#0B132B] dark:bg-slate-900 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Nama Karyawan</th>
                    <th className="px-4 py-3 text-center">Jabatan</th>
                    <th className="px-4 py-3">Aksi</th>
                    <th className="px-4 py-3">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white/40">
                  {recentAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-semibold">{log.time}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{log.userName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-extrabold border uppercase ${
                          log.role === "SUPERADMIN" 
                            ? "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-400" 
                            : log.role === "MANAGER"
                            ? "bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400"
                            : log.role === "GUDANG"
                            ? "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400"
                            : "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400"
                        }`}>
                          {log.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          log.action.includes("DELETE") 
                            ? "bg-red-50 text-red-700 border-red-150 dark:bg-red-950/30"
                            : log.action.includes("UPDATE")
                            ? "bg-amber-50 text-amber-700 border-amber-150 dark:bg-amber-950/30"
                            : "bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-950/30"
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-550 dark:text-zinc-400 font-medium max-w-xs truncate" title={log.details}>
                        {log.details}
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

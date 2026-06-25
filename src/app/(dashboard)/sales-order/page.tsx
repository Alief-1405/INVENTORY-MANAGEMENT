"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  FilePlus, 
  User, 
  ShoppingCart, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Calendar,
  Plus,
  X,
  LayoutGrid,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { getProducts } from "@/app/actions/product";
import { createSalesOrder, confirmPayment } from "@/app/actions/sales";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SalesOrderPage() {
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // States untuk Katalog & Modal Interaktif
  const [activeTab, setActiveTab] = useState<"CATALOG" | "FORM">("CATALOG");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // States untuk Alur Pembayaran (Payment Gateway)
  const [createdSoData, setCreatedSoData] = useState<any | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"QRIS" | "TRANSFER">("QRIS");
  const [confirmingPayment, setConfirmingPayment] = useState(false);

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

  // 2. Fetch data produk untuk katalog/dropdown
  const { data: productsRes, isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ["sales-products-list"],
    queryFn: () => getProducts()
  });

  const isSalesOrAdmin = profileRes?.role === "SALES" || profileRes?.role === "SUPERADMIN";

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setProductId(product.id);
    setQuantity(1);
    setIsOrderModalOpen(true);
  };

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

    const targetProduct = selectedProduct || products.find((p: any) => p.id === productId);
    if (targetProduct && quantity > targetProduct.stock) {
      toast.error(`Kuantitas melebihi sisa stok gudang (${targetProduct.stock} unit).`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await createSalesOrder(customerName, productId, quantity, notes);
      if (res.success && res.data) {
        toast.success(`Sales Order ${res.data.soNumber} berhasil dibuat dengan status PENDING_PAYMENT.`);
        setCreatedSoData(res.data);
        setIsOrderModalOpen(false);
        setIsPaymentModalOpen(true);
      } else {
        toast.error(res.message || "Gagal membuat Sales Order.");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem saat menyimpan Sales Order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!createdSoData) return;
    setConfirmingPayment(true);
    try {
      const res = await confirmPayment(createdSoData.id, paymentMethod);
      if (res.success) {
        toast.success("Pembayaran berhasil dikonfirmasi! Status SO sekarang: PAID.");
        // Invalidate cache dan re-fetch data produk agar stok ter-sync
        refetchProducts();
        queryClient.invalidateQueries({ queryKey: ["dashboard-live-stats"] });
        
        // Reset form & state
        setCustomerName("");
        setProductId("");
        setQuantity(1);
        setNotes("");
        setSelectedProduct(null);
        setCreatedSoData(null);
        setIsPaymentModalOpen(false);
      } else {
        toast.error(res.message || "Gagal mengonfirmasi pembayaran.");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem saat mengkonfirmasi pembayaran.");
    } finally {
      setConfirmingPayment(false);
    }
  };

  if (loadingProfile || loadingProducts) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-teal-650" />
        <p className="text-sm text-slate-500 font-medium">Memuat halaman katalog & formulir SO...</p>
      </div>
    );
  }

  const products = productsRes?.success && productsRes.data ? productsRes.data : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">
            Katalog & Order Penjualan
          </h1>
          <p className="text-slate-500 text-sm">
            Tawarkan katalog barang secara interaktif dan buat dokumen Sales Order (SO) instan untuk customer.
          </p>
        </div>
      </div>

      {/* Warning Otoritas Akses */}
      {!isSalesOrAdmin && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-250 text-amber-800 rounded-2xl max-w-xl text-xs font-semibold">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <span>Sebagai role <b>{profileRes?.role}</b>, Anda tidak diizinkan membuat SO baru secara resmi. Halaman ini hanya untuk role <b>SALES</b> atau <b>SUPERADMIN</b>.</span>
        </div>
      )}

      {/* Tab Switcher - Premium HSL & Hover Micro-animations */}
      <div className="flex border-b border-slate-200/80 dark:border-zinc-800/85">
        <button
          onClick={() => setActiveTab("CATALOG")}
          className={`pb-3 text-sm font-bold border-b-2 px-5 flex items-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer ${
            activeTab === "CATALOG"
              ? "border-[#0B132B] text-[#0B132B] dark:border-slate-100 dark:text-slate-100"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          Katalog Penjualan Interaktif
        </button>
        <button
          onClick={() => setActiveTab("FORM")}
          className={`pb-3 text-sm font-bold border-b-2 px-5 flex items-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer ${
            activeTab === "FORM"
              ? "border-[#0B132B] text-[#0B132B] dark:border-slate-100 dark:text-slate-100"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
          }`}
        >
          <FileText className="h-4 w-4" />
          Formulir Cepat
        </button>
      </div>

      {/* Tampilan Konten Berdasarkan Tab */}
      {activeTab === "CATALOG" ? (
        /* ==================== 1. INTERACTIVE SALES CATALOG GRID ==================== */
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.length === 0 ? (
            <div className="sm:col-span-2 md:col-span-3 lg:col-span-4 p-12 text-center bg-white/40 dark:bg-zinc-950 border border-dashed rounded-2xl">
              <ShoppingCart className="h-10 w-10 text-slate-350 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 dark:text-zinc-200">Katalog Kosong</h3>
              <p className="text-xs text-slate-550 mt-1">Belum ada produk aktif yang terdaftar di database.</p>
            </div>
          ) : (
            products.map((prod: any) => {
              const isOut = prod.stock === 0;
              const isLow = prod.stock <= prod.minStock && prod.stock > 0;

              return (
                <Card key={prod.id} className="group overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl flex flex-col justify-between">
                  <div>
                    {/* Placeholder Gambar dengan Gradien Premium */}
                    <div className="relative aspect-video w-full bg-gradient-to-tr from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 flex items-center justify-center overflow-hidden">
                      <ShoppingCart className="h-10 w-10 text-indigo-350 dark:text-indigo-900 group-hover:scale-110 transition-transform duration-300" />
                      
                      {/* Badge Sisa Stok */}
                      <div className="absolute top-2 right-2">
                        {isOut ? (
                          <span className="inline-flex items-center rounded-full bg-red-50 text-red-800 border border-red-200 px-2.5 py-0.5 text-[9px] font-extrabold uppercase dark:bg-red-950/20 dark:text-red-400">
                            Habis
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-250 px-2.5 py-0.5 text-[9px] font-extrabold uppercase animate-pulse dark:bg-amber-950/20 dark:text-amber-400">
                            Low Stok ({prod.stock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[9px] font-extrabold uppercase dark:bg-emerald-950/20 dark:text-emerald-400">
                            Stok: {prod.stock} Pcs
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Konten Identitas Barang */}
                    <div className="p-4 space-y-1">
                      <span className="font-mono text-[9px] font-bold text-slate-400 tracking-wider block">{prod.sku}</span>
                      <h3 className="font-bold text-slate-800 dark:text-zinc-150 line-clamp-1 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors duration-250">{prod.name}</h3>
                      <p className="text-base font-extrabold text-[#0B132B] dark:text-slate-100">
                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(prod.sellPrice)}
                      </p>
                    </div>
                  </div>

                  {/* Tombol Action */}
                  <div className="p-4 pt-0">
                    <Button
                      onClick={() => handleSelectProduct(prod)}
                      disabled={isOut || !isSalesOrAdmin}
                      className="w-full bg-[#0B132B] hover:bg-[#1C2541] text-white text-xs font-bold py-2 rounded-xl transition-all cursor-pointer shadow-sm group-hover:shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5 text-teal-400" />
                      Pilih Produk
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* ==================== 2. FORMULIR CEPAT (CONVENTIONAL FORM) ==================== */
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-[#0B132B] flex items-center gap-2">
                <FilePlus className="h-5 w-5 text-indigo-650" />
                Formulir Permintaan Barang
              </CardTitle>
              <CardDescription className="text-slate-555 text-xs">
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
                      value={`SO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-XXXX (Draft)`}
                      disabled
                      className="w-full py-2.5 px-3 bg-slate-100/65 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-slate-450 cursor-not-allowed outline-none"
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

          {/* Panduan Alur Transaksi */}
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
                  <p className="text-slate-500 text-[11px] mt-0.5">Sales menginput pelanggan dan kuantitas barang. Status awal: <b>PENDING_PAYMENT</b>.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-600 text-xs">2</div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-zinc-250">Pembayaran & Pelunasan</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">Customer membayar via QRIS/Transfer. Status di-update ke: <b>PAID</b>.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-600 text-xs">3</div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-zinc-250">Pengeluaran Gudang (DO)</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">Stok gudang dipotong dan DO dicetak oleh Gudang saat status <b>PAID</b>. Status akhir: <b>DONE</b>.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== 3. MODAL PEMESANAN SALES ORDER & KALKULATOR TOTAL ==================== */}
      {isOrderModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/40 bg-white/75 backdrop-blur-md p-6 shadow-2xl dark:bg-zinc-950 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-zinc-855">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-[#0B132B] dark:text-slate-50 flex items-center gap-1.5">
                  <ShoppingCart className="h-5 w-5 text-indigo-650" />
                  Buat Sales Order (SO) Baru
                </h2>
                <p className="text-xs text-slate-550 mt-0.5 font-medium">
                  Selesaikan detail pemesanan pelanggan untuk produk terpilih.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsOrderModalOpen(false);
                  setSelectedProduct(null);
                }}
                className="h-8 w-8 p-0 rounded-xl"
              >
                <X className="h-4.5 w-4.5" />
              </Button>
            </div>

            {/* Form Modal */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                {/* Operator/Sales */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    SALES / OPERATOR
                  </label>
                  <input
                    type="text"
                    value={profileRes?.name || ""}
                    disabled
                    className="w-full py-2 px-3 bg-slate-100/50 dark:bg-zinc-900/50 border border-slate-200/80 dark:border-zinc-850 rounded-xl font-bold text-slate-555 cursor-not-allowed outline-none"
                  />
                </div>

                {/* Nomor SO otomatis draft */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    NOMOR SO (OTOMATIS)
                  </label>
                  <input
                    type="text"
                    value={`SO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-XXXX (Draft)`}
                    disabled
                    className="w-full py-2 px-3 bg-slate-100/50 dark:bg-zinc-900/50 border border-slate-200/80 dark:border-zinc-850 rounded-xl font-mono font-bold text-slate-450 cursor-not-allowed outline-none"
                  />
                </div>

                {/* Detail Produk */}
                <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/10 rounded-xl border border-indigo-100/30 sm:col-span-2 space-y-1">
                  <div className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider">Produk Terpilih</div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-extrabold text-slate-800 dark:text-zinc-200 text-sm">{selectedProduct.name}</span>
                      <span className="text-[10px] font-mono text-slate-455 block">SKU: {selectedProduct.sku}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Stok Gudang</span>
                      <span className="font-extrabold text-slate-850 dark:text-zinc-200">{selectedProduct.stock} Pcs</span>
                    </div>
                  </div>
                </div>

                {/* Pelanggan */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="modalCustomerName" className="text-[10px] font-bold text-slate-500 uppercase">Nama Pelanggan / Customer</label>
                  <input
                    id="modalCustomerName"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: CV. Mandiri Agung"
                    required
                    className="w-full py-2.5 px-3 bg-white/70 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none"
                  />
                </div>

                {/* Harga Satuan */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Harga Satuan (IDR)</label>
                  <input
                    type="text"
                    value={new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(selectedProduct.sellPrice)}
                    disabled
                    className="w-full py-2 px-3 bg-slate-100/50 dark:bg-zinc-900/50 border border-slate-200/80 dark:border-zinc-800 rounded-xl font-bold text-slate-550 cursor-not-allowed outline-none"
                  />
                </div>

                {/* Kuantitas (QTY) */}
                <div className="space-y-1.5">
                  <label htmlFor="modalQuantity" className="text-[10px] font-bold text-slate-500 uppercase">Kuantitas (QTY)</label>
                  <input
                    id="modalQuantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="w-full py-2 px-3 bg-white/70 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-800 dark:text-zinc-200 outline-none"
                  />
                </div>

                {/* Catatan tambahan */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="modalNotes" className="text-[10px] font-bold text-slate-500 uppercase">Catatan Tambahan / Alamat</label>
                  <textarea
                    id="modalNotes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tulis instruksi khusus pengiriman di sini..."
                    rows={2}
                    className="w-full p-2.5 bg-white/70 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none resize-none"
                  />
                </div>

                {/* TOTAL KALKULATOR REAL-TIME */}
                <div className="p-4 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-100/30 rounded-2xl sm:col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Kalkulasi Total Pembayaran</span>
                    <span className="text-xs font-bold text-slate-400">{quantity} Pcs x {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(selectedProduct.sellPrice)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-450">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(selectedProduct.sellPrice) * quantity)}
                    </span>
                  </div>
                </div>

                {/* Alert jika QTY melebihi stok */}
                {quantity > selectedProduct.stock && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl sm:col-span-2 flex items-start gap-2">
                    <AlertCircle className="h-4.5 w-4.5 text-red-650 shrink-0 mt-0.5 animate-bounce" />
                    <span className="font-bold text-[10px]">Peringatan: Jumlah pesanan ({quantity} Pcs) melebihi persediaan stok produk aktif ({selectedProduct.stock} Pcs) di gudang!</span>
                  </div>
                )}
              </div>

              {/* Tombol Aksi Form */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-zinc-850">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsOrderModalOpen(false);
                    setSelectedProduct(null);
                  }}
                  disabled={submitting}
                  className="text-xs font-bold rounded-xl"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting || quantity > selectedProduct.stock}
                  className="bg-[#0B132B] hover:bg-[#1C2541] text-white font-bold text-xs shadow-sm rounded-xl px-5 flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Menerbitkan SO...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                      Terbitkan SO
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 4. MODAL METODE PEMBAYARAN ==================== */}
      {isPaymentModalOpen && createdSoData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-white/40 bg-white/80 backdrop-blur-md p-6 shadow-2xl dark:bg-zinc-950 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-zinc-855">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-[#0B132B] dark:text-slate-55 flex items-center gap-1.5">
                  <ShoppingCart className="h-5 w-5 text-indigo-650" />
                  Metode Pembayaran
                </h2>
                <p className="text-xs text-slate-550 mt-0.5 font-medium">
                  Pilih metode pembayaran untuk SO: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{createdSoData.soNumber}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setCreatedSoData(null);
                  setCustomerName("");
                  setProductId("");
                  setQuantity(1);
                  setNotes("");
                  setSelectedProduct(null);
                }}
                className="h-8 w-8 p-0 rounded-xl"
              >
                <X className="h-4.5 w-4.5" />
              </Button>
            </div>

            {/* Konten Pilihan Metode Pembayaran */}
            <div className="space-y-4 pt-4 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("QRIS")}
                  className={`flex-1 py-3 px-4 border rounded-2xl font-bold transition-all text-center cursor-pointer ${
                    paymentMethod === "QRIS"
                      ? "border-indigo-650 bg-indigo-50/50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/20 dark:text-indigo-400"
                      : "border-slate-200 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  }`}
                >
                  QRIS (Otomatis)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("TRANSFER")}
                  className={`flex-1 py-3 px-4 border rounded-2xl font-bold transition-all text-center cursor-pointer ${
                    paymentMethod === "TRANSFER"
                      ? "border-indigo-650 bg-indigo-50/50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/20 dark:text-indigo-400"
                      : "border-slate-200 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  }`}
                >
                  Transfer Bank
                </button>
              </div>

              {/* Rincian Finansial Pesanan */}
              <div className="p-3.5 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl border border-slate-100 dark:border-zinc-850 flex items-center justify-between font-medium">
                <span className="text-slate-500">Total Tagihan:</span>
                <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(createdSoData.totalPrice))}
                </span>
              </div>

              {/* Tampilan Visual Sesuai Metode */}
              {paymentMethod === "QRIS" ? (
                <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-850 space-y-2">
                  <div className="h-44 w-44 bg-slate-100 flex items-center justify-center rounded-xl p-2 border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700">
                    <svg className="w-full h-full text-slate-800 dark:text-slate-200" viewBox="0 0 100 100">
                      <rect x="5" y="5" width="20" height="20" fill="currentColor" />
                      <rect x="10" y="10" width="10" height="10" fill="white" />
                      <rect x="75" y="5" width="20" height="20" fill="currentColor" />
                      <rect x="80" y="10" width="10" height="10" fill="white" />
                      <rect x="5" y="75" width="20" height="20" fill="currentColor" />
                      <rect x="10" y="80" width="10" height="10" fill="white" />
                      
                      <rect x="35" y="15" width="15" height="5" fill="currentColor" />
                      <rect x="40" y="25" width="5" height="15" fill="currentColor" />
                      <rect x="60" y="5" width="10" height="15" fill="currentColor" />
                      <rect x="60" y="30" width="15" height="5" fill="currentColor" />
                      <rect x="30" y="45" width="25" height="10" fill="currentColor" />
                      <rect x="15" y="35" width="10" height="5" fill="currentColor" />
                      <rect x="85" y="35" width="5" height="25" fill="currentColor" />
                      <rect x="65" y="55" width="15" height="15" fill="currentColor" />
                      <rect x="35" y="65" width="20" height="5" fill="currentColor" />
                      <rect x="35" y="75" width="5" height="20" fill="currentColor" />
                      <rect x="50" y="85" width="25" height="10" fill="currentColor" />
                      <rect x="85" y="80" width="10" height="5" fill="currentColor" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-slate-405 uppercase tracking-wider">Pindai Kode QRIS di Atas</span>
                </div>
              ) : (
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-850 space-y-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Rekening Tujuan</span>
                    <div className="font-extrabold text-sm text-slate-800 dark:text-zinc-200">Bank Central Asia (BCA)</div>
                    <div className="font-mono text-base font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider">123-456-7890</div>
                    <div className="text-[10px] font-bold text-slate-500">a.n. PT. INVENTORY MANAGEMENT SYSTEM</div>
                  </div>
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl text-[10px] text-amber-800 dark:text-amber-400 font-semibold">
                    Kirim jumlah transfer tepat sesuai dengan total tagihan di atas.
                  </div>
                </div>
              )}

              {/* Tombol Konfirmasi */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-zinc-850">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    setCreatedSoData(null);
                    setCustomerName("");
                    setProductId("");
                    setQuantity(1);
                    setNotes("");
                    setSelectedProduct(null);
                  }}
                  disabled={confirmingPayment}
                  className="flex-1 font-bold text-xs rounded-xl"
                >
                  Bayar Nanti
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={confirmingPayment}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {confirmingPayment ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Memverifikasi...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-350" />
                      Konfirmasi Bayar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

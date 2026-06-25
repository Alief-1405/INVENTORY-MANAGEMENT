"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, ShoppingCart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createOfficialPurchaseOrder } from "@/app/actions/purchase-order";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SupplierOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  buyPrice: number;
}

interface OfficialPOFormProps {
  suppliers: SupplierOption[];
  products: ProductOption[];
  defaultSupplierId?: string;
  defaultProductId?: string;
}

interface POItemInput {
  productId: string;
  quantity: number;
  price: number;
}

export default function OfficialPOForm({
  suppliers,
  products,
  defaultSupplierId = "",
  defaultProductId = ""
}: OfficialPOFormProps) {
  const [supplierId, setSupplierId] = useState(defaultSupplierId || (suppliers[0]?.id || ""));
  const [items, setItems] = useState<POItemInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inisialisasi item bawaan saat parameter pencarian berubah (misal dari pintasan restock)
  useEffect(() => {
    if (defaultSupplierId) {
      setSupplierId(defaultSupplierId);
    }
    
    if (defaultProductId && products.length > 0) {
      const selected = products.find(p => p.id === defaultProductId);
      setItems([
        {
          productId: defaultProductId,
          quantity: 50, // default quantity untuk restock
          price: selected ? selected.buyPrice : 0
        }
      ]);
    } else if (items.length === 0) {
      // Default baris kosong jika belum ada item
      setItems([{ productId: "", quantity: 1, price: 0 }]);
    }
  }, [defaultProductId, defaultSupplierId, products]);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { productId: "", quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof POItemInput, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      
      // Jika produk berubah, auto-populate harga beli bawaan (buyPrice)
      if (field === "productId") {
        const prod = products.find(p => p.id === value);
        if (prod) {
          copy[index].price = prod.buyPrice;
        }
      }
      return copy;
    });
  };

  // Hitung grand total
  const grandTotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      toast.error("Silakan pilih supplier terlebih dahulu.");
      return;
    }

    // Filter out rows that do not have a product selected
    const validItems = items.filter(item => item.productId !== "");
    if (validItems.length === 0) {
      toast.error("Silakan masukkan minimal satu item barang yang valid.");
      return;
    }

    // Validate quantities and prices
    for (const item of validItems) {
      if (item.quantity <= 0) {
        toast.error("Kuantitas barang harus lebih dari 0.");
        return;
      }
      if (item.price < 0) {
        toast.error("Harga satuan barang tidak boleh negatif.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await createOfficialPurchaseOrder(supplierId, validItems);
      if (res.success) {
        toast.success("Pengajuan Purchase Order Resmi berhasil dikirim!");
        // Reset form
        setItems([{ productId: "", quantity: 1, price: 0 }]);
        if (suppliers[0]) setSupplierId(suppliers[0].id);
      } else {
        toast.error(res.message || "Gagal membuat Purchase Order.");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem saat memproses PO.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm w-full max-w-4xl">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
        <CardTitle className="text-lg font-bold text-[#0B132B] dark:text-zinc-150 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-indigo-650" />
          Ajukan Purchase Order Resmi Perusahaan
        </CardTitle>
        <CardDescription className="text-slate-550 text-xs">
          Buat dokumen PO resmi multi-item dengan kalkulasi subtotal dan grand total otomatis untuk persetujuan Manager.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Baris Atas: Pilih Supplier */}
          <div className="max-w-xs space-y-1.5">
            <label htmlFor="form-supplier" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pilih Supplier</label>
            <select
              id="form-supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full py-2.5 px-3 bg-white/80 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none cursor-pointer focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              required
            >
              <option value="" disabled>-- Pilih Supplier --</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>{sup.name}</option>
              ))}
            </select>
          </div>

          {/* Tabel Detail Item (Dinamis) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Detail Item Pengadaan</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-8 border border-slate-200 dark:border-zinc-800 bg-white hover:bg-slate-50 text-indigo-650 dark:text-indigo-400 font-bold px-3 rounded-lg text-xs cursor-pointer"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Tambah Item Barang
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-150 dark:border-zinc-850 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-zinc-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Produk</th>
                    <th className="px-4 py-3 w-[110px] text-right">Kuantitas</th>
                    <th className="px-4 py-3 w-[160px] text-right">Harga Satuan (Rp)</th>
                    <th className="px-4 py-3 w-[160px] text-right">Subtotal</th>
                    <th className="px-4 py-3 w-[60px] text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white/20">
                  {items.map((item, index) => {
                    const subtotal = item.quantity * item.price;
                    return (
                      <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 transition-all">
                        {/* Pilihan Produk */}
                        <td className="px-4 py-2">
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                            className="w-full py-1.5 px-2.5 bg-white/80 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 rounded-lg text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none cursor-pointer focus:border-indigo-650"
                            required
                          >
                            <option value="">-- Pilih Produk --</option>
                            {products.map((prod) => (
                              <option key={prod.id} value={prod.id}>
                                {prod.name} ({prod.sku})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Kuantitas (QTY) */}
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                            className="w-full py-1.5 px-2.5 bg-white/80 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 rounded-lg text-xs font-semibold text-right text-slate-850 dark:text-zinc-150 outline-none focus:border-indigo-650"
                            required
                          />
                        </td>

                        {/* Harga Satuan */}
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={item.price}
                            onChange={(e) => handleItemChange(index, "price", Number(e.target.value))}
                            className="w-full py-1.5 px-2.5 bg-white/80 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 rounded-lg text-xs font-semibold text-right text-slate-855 dark:text-zinc-150 outline-none focus:border-indigo-650"
                            required
                          />
                        </td>

                        {/* Subtotal */}
                        <td className="px-4 py-2 text-right font-extrabold text-[#0B132B] dark:text-zinc-100 whitespace-nowrap">
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            maximumFractionDigits: 0
                          }).format(subtotal)}
                        </td>

                        {/* Hapus Baris */}
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            disabled={items.length <= 1}
                            className="text-slate-400 hover:text-rose-650 transition-colors p-1 disabled:opacity-30 cursor-pointer"
                            title="Hapus item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Form: Grand Total & Tombol Submit */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-slate-150 dark:border-zinc-800 pt-4 gap-4">
            <div className="text-right sm:text-left">
              <span className="text-xs font-bold text-slate-400 uppercase block tracking-wider">Grand Total PO</span>
              <span className="text-xl font-black text-[#0B132B] dark:text-teal-400">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0
                }).format(grandTotal)}
              </span>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#0B132B] hover:bg-[#1C2541] active:bg-[#0B132B] text-white font-bold h-11 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                  Mengirim Pengajuan PO...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 text-teal-400" />
                  Kirim Pengajuan PO Resmi
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

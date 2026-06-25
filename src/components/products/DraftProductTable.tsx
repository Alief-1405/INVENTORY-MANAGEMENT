"use client";

import { useState } from "react";
import { Trash2, Edit3, Check, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ProductDraft {
  sku: string;
  name: string;
  sellPrice: number;
  stock: number;
  minStock: number;
}

interface DraftProductTableProps {
  products: ProductDraft[];
  onUpdate: (index: number, updated: ProductDraft) => void;
  onRemove: (index: number) => void;
}

export default function DraftProductTable({ products, onUpdate, onRemove }: DraftProductTableProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ProductDraft | null>(null);

  const startEdit = (index: number, product: ProductDraft) => {
    setEditingIndex(index);
    setEditForm({ ...product });
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const saveEdit = (index: number) => {
    if (editForm) {
      onUpdate(index, editForm);
      cancelEdit();
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
      <Table>
        <TableHeader className="bg-slate-50/50 dark:bg-zinc-900/50">
          <TableRow>
            <TableHead className="font-semibold text-slate-800 dark:text-slate-200 w-[120px]">SKU</TableHead>
            <TableHead className="font-semibold text-slate-800 dark:text-slate-200">Nama Produk</TableHead>
            <TableHead className="font-semibold text-slate-800 dark:text-slate-200 text-right w-[150px]">Harga Jual (Rp)</TableHead>
            <TableHead className="font-semibold text-slate-800 dark:text-slate-200 text-center w-[120px]">Stok Awal</TableHead>
            <TableHead className="font-semibold text-slate-800 dark:text-slate-200 text-center w-[120px]">Stok Min</TableHead>
            <TableHead className="font-semibold text-slate-800 dark:text-slate-200 text-center w-[120px]">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product, index) => {
            const isEditing = editingIndex === index;

            if (isEditing && editForm) {
              return (
                <TableRow key={index} className="hover:bg-slate-50/20 dark:hover:bg-zinc-900/20 transition-colors">
                  <TableCell className="py-2.5">
                    <Input
                      type="text"
                      value={editForm.sku}
                      onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                      className="bg-white dark:bg-zinc-900 font-mono text-xs font-semibold h-8"
                    />
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="bg-white dark:bg-zinc-900 h-8"
                    />
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <Input
                      type="number"
                      value={editForm.sellPrice}
                      onChange={(e) => setEditForm({ ...editForm, sellPrice: Number(e.target.value) })}
                      className="bg-white dark:bg-zinc-900 text-right h-8"
                    />
                  </TableCell>
                  <TableCell className="py-2.5 text-center">
                    <Input
                      type="number"
                      value={editForm.stock}
                      onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })}
                      className="bg-white dark:bg-zinc-900 text-center h-8"
                    />
                  </TableCell>
                  <TableCell className="py-2.5 text-center">
                    <Input
                      type="number"
                      value={editForm.minStock}
                      onChange={(e) => setEditForm({ ...editForm, minStock: Number(e.target.value) })}
                      className="bg-white dark:bg-zinc-900 text-center h-8"
                    />
                  </TableCell>
                  <TableCell className="py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => saveEdit(index)}
                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={cancelEdit}
                        className="h-7 w-7 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-900"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            }

            return (
              <TableRow key={index} className="hover:bg-slate-50/20 dark:hover:bg-zinc-900/20 transition-colors">
                <TableCell className="font-mono text-xs font-semibold">{product.sku}</TableCell>
                <TableCell className="font-medium text-slate-900 dark:text-slate-100">{product.name}</TableCell>
                <TableCell className="text-right font-semibold">
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(product.sellPrice)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="bg-slate-50 dark:bg-zinc-900 font-semibold px-2 py-0.5">
                    {product.stock} pcs
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-medium text-slate-500">{product.minStock} pcs</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(index, product)}
                      className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                      title="Ubah Item"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemove(index)}
                      className="h-7 w-7 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      title="Hapus dari Draf"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

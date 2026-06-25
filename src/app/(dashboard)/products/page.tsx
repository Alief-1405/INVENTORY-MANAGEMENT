"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Plus, Search, Edit, Trash2, Loader2, AlertCircle, CheckCircle2, ShoppingBag, X, Sparkles, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"

import { getProducts, createProduct, updateProduct, deleteProduct } from "@/app/actions/product"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import RoleGate from "@/components/auth/role-gate"

import ExcelImporter from "@/components/products/ExcelImporter"
import AIScanner from "@/components/products/AIScanner"
import DraftProductTable from "@/components/products/DraftProductTable"

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  
  // States untuk modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  
  // States untuk input form
  const [sku, setSku] = useState("")
  const [name, setName] = useState("")
  const [sellPrice, setSellPrice] = useState<number>(0)
  const [stock, setStock] = useState<number>(0)
  const [minStock, setMinStock] = useState<number>(10)
  
  // Loading state untuk aksi form
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  // States untuk panel impor massal / AI
  const [activeImportPanel, setActiveImportPanel] = useState<"NONE" | "EXCEL" | "AI">("NONE")
  const [draftProducts, setDraftProducts] = useState<any[]>([])
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  const handleAddDraftProducts = (newProducts: any[]) => {
    setDraftProducts((prev) => [...prev, ...newProducts])
  }

  const handleUpdateDraftProduct = (index: number, updated: any) => {
    setDraftProducts((prev) => {
      const copy = [...prev]
      copy[index] = updated
      return copy
    })
  }

  const handleRemoveDraftProduct = (index: number) => {
    setDraftProducts((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveBulkDrafts = async () => {
    if (draftProducts.length === 0) return
    setIsSavingDraft(true)
    try {
      const response = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: draftProducts }),
      })
      const result = await response.json()
      if (response.ok && result.success) {
        toast.success(result.message || "Produk draf berhasil disimpan!")
        setDraftProducts([])
        setActiveImportPanel("NONE")
        refetch()
      } else {
        throw new Error(result.message || "Gagal menyimpan produk.")
      }
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan saat menyimpan draf.")
    } finally {
      setIsSavingDraft(false)
    }
  }

  // Query mengambil data produk
  const { data: result, isLoading, isError, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts(),
  })

  const products = result?.data || []

  // Query mengambil data profil user untuk Role-Based Access Control
  const { data: profile } = useQuery<{ id: string; name: string; email: string; role: string }>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile")
      if (!res.ok) throw new Error("Gagal mengambil profil.")
      const json = await res.json()
      return json.data
    }
  })

  const currentRole = profile?.role
  const isPurchasing = currentRole === "PURCHASING"
  // Selama data loading (currentRole belum terisi), default ke true untuk menyelaraskan colSpan tabel
  const isAllowedToEdit = !currentRole || ["GUDANG", "PURCHASING", "SUPERADMIN"].includes(currentRole)

  if (isError || (result && !result.success)) {
    toast.error("Gagal memuat produk")
  }

  // Buka modal tambah produk
  const handleOpenCreateModal = () => {
    setModalMode("create")
    setSelectedProductId(null)
    setSku("")
    setName("")
    setSellPrice(0)
    setStock(0)
    setMinStock(10)
    setIsModalOpen(true)
  }

  // Buka modal edit produk
  const handleOpenEditModal = (product: any) => {
    setModalMode("edit")
    setSelectedProductId(product.id)
    setSku(product.sku)
    setName(product.name)
    setSellPrice(product.sellPrice)
    setStock(product.stock)
    setMinStock(product.minStock)
    setIsModalOpen(true)
  }

  // Simpan data (Tambah / Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sku.trim() || !name.trim()) {
      toast.error("SKU dan Nama Produk wajib diisi!")
      return
    }

    if (sellPrice <= 0) {
      toast.error("Harga Jual harus lebih dari 0!")
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        sku,
        name,
        sellPrice: Number(sellPrice),
        stock: Number(stock),
        minStock: Number(minStock),
      }

      let res
      if (modalMode === "create") {
        res = await createProduct(payload)
      } else {
        res = await updateProduct(selectedProductId!, payload)
      }

      if (res.success) {
        toast.success(
          modalMode === "create" 
            ? "Produk baru berhasil ditambahkan!" 
            : "Data produk berhasil diperbarui!"
        )
        setIsModalOpen(false)
        refetch()
      } else {
        toast.error(res.message || "Terjadi kesalahan.")
      }
    } catch (err: any) {
      toast.error("Gagal menyimpan data produk.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Hapus produk
  const handleDelete = async (id: string, productName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${productName}"?`)) {
      return
    }

    setIsDeletingId(id)
    try {
      const res = await deleteProduct(id)
      if (res.success) {
        toast.success("Produk berhasil dihapus.")
        refetch()
      } else {
        toast.error(res.message || "Gagal menghapus produk.")
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem.")
    } finally {
      setIsDeletingId(null)
    }
  }

  // Filter produk harian di client-side
  const filteredProducts = products.filter((p: any) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())

    let matchesStatus = true
    const isLow = p.stock <= p.minStock && p.stock > 0
    const isOut = p.stock === 0
    const isAvailable = p.stock > p.minStock

    if (statusFilter === "AVAILABLE") {
      matchesStatus = isAvailable
    } else if (statusFilter === "LOW_STOCK") {
      matchesStatus = isLow
    } else if (statusFilter === "OUT_OF_STOCK") {
      matchesStatus = isOut
    }

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">
            {isPurchasing ? "Katalog & Pengadaan Produk" : "Manajemen Produk"}
          </h1>
          <p className="text-slate-500 text-sm">
            {isPurchasing
              ? "Pantau katalog produk, harga beli, stok minimum, serta ajukan restock barang."
              : "Kelola katalog barang, pantau tingkat persediaan, dan atur batas minimum stok."}
          </p>
        </div>
        <RoleGate allowedRoles={["GUDANG", "PURCHASING", "SUPERADMIN"]} currentRole={currentRole}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Impor Excel (Secondary Button) */}
            <Button
              variant="outline"
              onClick={() => setActiveImportPanel(activeImportPanel === "EXCEL" ? "NONE" : "EXCEL")}
              className={`group font-bold border-slate-200/80 dark:border-slate-800 transition-all duration-300 rounded-xl hover:bg-slate-100/50 dark:hover:bg-zinc-900/50 active:scale-95 text-xs ${
                activeImportPanel === "EXCEL" 
                  ? "border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20" 
                  : "text-slate-600 hover:text-slate-800 dark:text-zinc-300 bg-white/40"
              }`}
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600 group-hover:scale-115 group-hover:rotate-6 transition-transform duration-200" />
              Impor Excel
            </Button>

            {/* AI Vision Scan (Secondary Button - Sembunyikan untuk Purchasing) */}
            {!isPurchasing && (
              <Button
                variant="outline"
                onClick={() => setActiveImportPanel(activeImportPanel === "AI" ? "NONE" : "AI")}
                className={`group font-bold border-slate-200/80 dark:border-slate-800 transition-all duration-300 rounded-xl hover:bg-slate-100/50 dark:hover:bg-zinc-900/50 active:scale-95 text-xs ${
                  activeImportPanel === "AI" 
                    ? "border-purple-500 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20" 
                    : "text-slate-600 hover:text-slate-800 dark:text-zinc-300 bg-white/40"
                }`}
              >
                <Sparkles className="mr-1.5 h-4 w-4 text-purple-655 group-hover:scale-115 group-hover:rotate-12 transition-transform duration-200" />
                AI Vision Scan
              </Button>
            )}

            {/* Tambah Produk (Primary Button) */}
            <Button 
              onClick={handleOpenCreateModal} 
              className="group bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-750 hover:to-indigo-755 text-white font-bold shadow-md shadow-purple-600/10 hover:shadow-purple-600/20 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 rounded-xl border-none cursor-pointer text-xs"
            >
              <Plus className="mr-1.5 h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
              Tambah Produk
            </Button>
          </div>
        </RoleGate>
      </div>

      {/* Panel Upload Excel/AI jika aktif */}
      {activeImportPanel !== "NONE" && (
        <div className="grid grid-cols-1 gap-4 p-4 rounded-2xl border border-white/40 bg-white/50 dark:bg-zinc-950/10 backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-850 pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              {activeImportPanel === "EXCEL" ? "Metode Impor Excel" : "Metode AI Vision Scan"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveImportPanel("NONE")}
              className="h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {activeImportPanel === "EXCEL" ? (
            <ExcelImporter onDataImported={handleAddDraftProducts} />
          ) : (
            <AIScanner onDataExtracted={handleAddDraftProducts} />
          )}
        </div>
      )}

      {/* Draft Products Table (Review & Confirm) */}
      {draftProducts.length > 0 && (
        <div className="space-y-3 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/30 bg-blue-50/20 dark:bg-blue-950/5 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-blue-900 dark:text-blue-400">Tinjau Draf Produk ({draftProducts.length})</h3>
              <p className="text-xs text-blue-700/80 dark:text-blue-500 font-medium">
                Silakan periksa kembali data hasil ekstraksi di bawah sebelum disimpan permanen ke database Supabase.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDraftProducts([])}
                className="text-xs border-slate-200 dark:border-slate-800 rounded-xl"
              >
                Batalkan Semua
              </Button>
              <Button
                size="sm"
                onClick={handleSaveBulkDrafts}
                disabled={isSavingDraft}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm rounded-xl"
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Simpan ke Database
                  </>
                )}
              </Button>
            </div>
          </div>
          <DraftProductTable
            products={draftProducts}
            onUpdate={handleUpdateDraftProduct}
            onRemove={handleRemoveDraftProduct}
          />
        </div>
      )}

      {/* Kontrol Di Atas Tabel: Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <Input
            placeholder="Cari berdasarkan nama atau SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/60 backdrop-blur-md dark:bg-zinc-950 border-slate-200/85 focus:border-[#0B132B] focus:ring-[#0B132B]/10 rounded-xl text-sm"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
            <SelectTrigger className="bg-white/60 backdrop-blur-md dark:bg-zinc-950 border-slate-200/85 focus:border-[#0B132B] focus:ring-[#0B132B]/10 rounded-xl text-sm font-semibold text-slate-700">
              <SelectValue placeholder="Status Stok" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="AVAILABLE">Tersedia</SelectItem>
              <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Habis</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabel Data Produk */}
      <div className="bg-white/60 dark:bg-zinc-950 rounded-2xl border border-white/40 dark:border-slate-800 overflow-hidden shadow-sm backdrop-blur-md">
        <Table>
          <TableHeader className="bg-[#FAF9F5]/80 dark:bg-zinc-900/50">
            <TableRow>
              <TableHead className="font-extrabold text-[#0B132B] dark:text-slate-200 w-[120px]">SKU</TableHead>
              <TableHead className="font-extrabold text-[#0B132B] dark:text-slate-200">Nama Produk</TableHead>
              {isPurchasing && (
                <TableHead className="font-extrabold text-[#0B132B] dark:text-slate-200 text-right w-[130px]">Harga Beli (Cost)</TableHead>
              )}
              <TableHead className="font-extrabold text-[#0B132B] dark:text-slate-200 text-right w-[150px]">
                {isPurchasing ? "Harga Jual (Price)" : "Harga Jual"}
              </TableHead>
              <TableHead className="font-extrabold text-[#0B132B] dark:text-slate-200 text-right w-[100px]">
                {isPurchasing ? "Stok Saat Ini" : "Stok"}
              </TableHead>
              {isPurchasing && (
                <TableHead className="font-extrabold text-[#0B132B] dark:text-slate-200 text-right w-[130px]">Batas Minimum Stok</TableHead>
              )}
              <TableHead className="font-extrabold text-[#0B132B] dark:text-slate-200 text-center w-[130px]">Status</TableHead>
              <RoleGate allowedRoles={["GUDANG", "PURCHASING", "SUPERADMIN"]} currentRole={currentRole}>
                <TableHead className="font-extrabold text-[#0B132B] dark:text-slate-200 text-center w-[120px]">Aksi</TableHead>
              </RoleGate>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white/40">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  {isPurchasing && <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>}
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  {isPurchasing && <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>}
                  <TableCell><Skeleton className="h-6 w-20 mx-auto rounded-full" /></TableCell>
                  <RoleGate allowedRoles={["GUDANG", "PURCHASING", "SUPERADMIN"]} currentRole={currentRole}>
                    <TableCell><Skeleton className="h-6 w-16 mx-auto rounded-md" /></TableCell>
                  </RoleGate>
                </TableRow>
              ))
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isPurchasing ? 8 : (isAllowedToEdit ? 6 : 5)} className="text-center py-12 text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <ShoppingBag className="h-8 w-8 text-slate-400 stroke-1" />
                    <p className="font-semibold text-sm">Tidak ada produk ditemukan</p>
                    <p className="text-xs text-muted-foreground">Silakan tambah produk baru atau sesuaikan filter Anda.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product: any) => {
                const isLow = product.stock <= product.minStock && product.stock > 0
                const isOut = product.stock === 0
                const isCritical = product.stock <= product.minStock

                return (
                  <TableRow 
                    key={product.id} 
                    className={`hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-all duration-150 ${
                      isPurchasing && isCritical ? "bg-red-50/55 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-950/30" : ""
                    }`}
                  >
                    <TableCell className="font-mono text-xs font-bold text-slate-800">{product.sku}</TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-slate-100">{product.name}</TableCell>
                    {isPurchasing && (
                      <TableCell className="text-right font-bold text-slate-700 dark:text-zinc-300">
                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(product.buyPrice)}
                      </TableCell>
                    )}
                    <TableCell className="text-right font-bold text-[#0B132B]">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(product.sellPrice)}
                    </TableCell>
                    <TableCell className={`text-right font-extrabold ${
                      isCritical ? "text-red-650 dark:text-red-400 font-black" : "text-slate-950 dark:text-slate-50"
                    }`}>
                      {product.stock}
                    </TableCell>
                    {isPurchasing && (
                      <TableCell className="text-right font-semibold text-slate-650 dark:text-zinc-400">
                        {product.minStock}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      {isOut ? (
                        <Badge className="bg-red-50 text-red-800 hover:bg-red-50 dark:bg-red-500/10 dark:text-red-400 border border-red-200/50 dark:border-red-500/20 font-bold px-2.5 py-0.5 rounded-full text-xs shadow-xs">
                          Habis
                        </Badge>
                      ) : isLow ? (
                        <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20 font-bold px-2.5 py-0.5 rounded-full text-xs shadow-xs animate-pulse">
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20 font-bold px-2.5 py-0.5 rounded-full text-xs shadow-xs">
                          Tersedia
                        </Badge>
                      )}
                    </TableCell>
                    <RoleGate allowedRoles={["GUDANG", "PURCHASING", "SUPERADMIN"]} currentRole={currentRole}>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleOpenEditModal(product)} 
                            className="h-7.5 w-7.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-blue-950/20 transition-all rounded-lg"
                            title="Ubah Produk"
                          >
                            <Edit className="h-4.5 w-4.5" />
                          </Button>
                          {!isPurchasing && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(product.id, product.name)} 
                              className="h-7.5 w-7.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-red-950/20 transition-all rounded-lg"
                              disabled={isDeletingId === product.id}
                              title="Hapus Produk"
                            >
                              {isDeletingId === product.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-4.5 w-4.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </RoleGate>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Formulir Tambah/Edit Produk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-3xl border border-white/40 bg-white/70 backdrop-blur-md p-6 shadow-2xl dark:bg-zinc-950 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-xl font-extrabold tracking-tight text-[#0B132B] dark:text-slate-50">
              {modalMode === "create" ? "Tambah Produk Baru" : "Edit Informasi Produk"}
            </h2>
            <p className="text-xs text-slate-500 mt-1 mb-4 font-semibold">
              Silakan lengkapi formulir di bawah ini dengan informasi produk yang tepat.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* SKU */}
              <div className="space-y-1.5">
                <Label htmlFor="sku" className="text-xs font-bold text-slate-600 uppercase tracking-wide">SKU Produk</Label>
                <Input
                  id="sku"
                  placeholder="Contoh: BAR-001"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  disabled={modalMode === "edit"} // SKU tidak dapat disunting saat mode Edit
                  className="bg-white/40 dark:bg-zinc-900 border-slate-200/80 rounded-xl disabled:opacity-75"
                />
              </div>

              {/* Nama Produk */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-slate-600 uppercase tracking-wide">Nama Produk</Label>
                <Input
                  id="name"
                  placeholder="Contoh: Kertas A4 PaperOne"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/40 dark:bg-zinc-900 border-slate-200/80 rounded-xl"
                />
              </div>

              {/* Harga Jual */}
              <div className="space-y-1.5">
                <Label htmlFor="sellPrice" className="text-xs font-bold text-slate-600 uppercase tracking-wide">Harga Jual (IDR)</Label>
                <Input
                  id="sellPrice"
                  type="number"
                  placeholder="0"
                  value={sellPrice || ""}
                  onChange={(e) => setSellPrice(Number(e.target.value))}
                  className="bg-white/40 dark:bg-zinc-900 border-slate-200/80 rounded-xl"
                />
              </div>

              {/* Stok Awal & Stok Minimum */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="stock" className="text-xs font-bold text-slate-600 uppercase tracking-wide">Stok Saat Ini</Label>
                  <Input
                    id="stock"
                    type="number"
                    placeholder="0"
                    value={stock || ""}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="bg-white/40 dark:bg-zinc-900 border-slate-200/80 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="minStock" className="text-xs font-bold text-slate-600 uppercase tracking-wide">Stok Minimum</Label>
                  <Input
                    id="minStock"
                    type="number"
                    placeholder="10"
                    value={minStock || ""}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="bg-white/40 dark:bg-zinc-900 border-slate-200/80 rounded-xl"
                  />
                </div>
              </div>

              {/* Aksi Tombol Form */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="text-xs font-bold rounded-xl"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[#0B132B] hover:bg-[#1C2541] text-white font-bold text-xs shadow-sm rounded-xl px-5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

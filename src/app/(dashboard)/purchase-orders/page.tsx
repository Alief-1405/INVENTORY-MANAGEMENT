import { getSession } from "@/lib/auth";
import { getPendingPurchaseOrders, createPurchaseOrder } from "@/app/actions/purchase-order";
import { prisma } from "@/lib/db";
import POApprovalTable from "@/components/po/POApprovalTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, PlusCircle, AlertCircle, ShoppingCart } from "lucide-react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

interface PageProps {
  searchParams: Promise<{ supplierId?: string; amount?: string; productId?: string }>;
}

export default async function PurchaseOrdersPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const defaultSupplierId = resolvedParams.supplierId || "";
  const defaultAmount = resolvedParams.amount || "";
  const defaultProductId = resolvedParams.productId || "";

  const userRole = session.role;
  const isPurchasingOrAdmin = userRole === "PURCHASING" || userRole === "SUPERADMIN";

  // Fetch pending POs
  const poRes = await getPendingPurchaseOrders();
  const pendingPOs = poRes.success && poRes.data ? poRes.data : [];

  // Fetch suppliers list for mock creation form
  const suppliers = await prisma.supplier.findMany({
    select: { id: true, name: true }
  });

  // Fetch products list for dropdown
  const products = await prisma.product.findMany({
    select: { id: true, name: true, sku: true }
  });

  // Jika belum ada supplier di database, buatkan satu otomatis untuk testing
  let activeSuppliers = suppliers;
  if (activeSuppliers.length === 0) {
    const defaultSupplier = await prisma.supplier.create({
      data: { 
        name: "PT Mitra Mandiri Utama", 
        contactName: "Hendrawan", 
        email: "hendrawan@mitramandiri.com",
        phone: "081234567890",
        address: "Kawasan Industri Jatake, Tangerang"
      }
    });
    activeSuppliers = [{ id: defaultSupplier.id, name: defaultSupplier.name }];
  }

  // Server Action untuk memproses form submit PO Baru
  async function handleCreatePO(formData: FormData) {
    "use server";
    const supplierId = formData.get("supplierId") as string;
    const amountStr = formData.get("amount") as string;
    const amount = Number(amountStr);
    const productId = formData.get("productId") as string;
    const quantityStr = formData.get("quantity") as string;
    const quantity = quantityStr ? Number(quantityStr) : 50;

    if (!supplierId || isNaN(amount) || amount <= 0) {
      return;
    }

    await createPurchaseOrder(supplierId, amount, productId || undefined, quantity);
    revalidatePath("/purchase-orders");
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">
          Alur Kerja Purchase Order
        </h1>
        <p className="text-slate-500 text-sm">
          Kelola siklus pengadaan barang mulai dari pengajuan dokumen hingga otorisasi persetujuan anggaran.
        </p>
      </div>

      {/* Grid: Form Pembuatan PO (Hanya PURCHASING / SUPERADMIN) */}
      {isPurchasingOrAdmin && (
        <Card className="border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm max-w-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-[#0B132B] flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-indigo-600" />
              Ajukan Purchase Order Baru (Testing)
            </CardTitle>
            <CardDescription className="text-slate-500 text-xs">
              Simulasi pengisian dokumen PO oleh staf purchasing untuk dikirim ke antrean persetujuan Manager.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleCreatePO} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Pilih Supplier */}
                <div className="space-y-1.5">
                  <label htmlFor="supplierId" className="text-xs font-bold text-slate-500">Pilih Supplier</label>
                  <select
                    id="supplierId"
                    name="supplierId"
                    className="w-full py-2.5 px-3 bg-white/80 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none cursor-pointer"
                    defaultValue={defaultSupplierId}
                    required
                  >
                    {activeSuppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </select>
                </div>

                {/* Total Biaya PO */}
                <div className="space-y-1.5">
                  <label htmlFor="amount" className="text-xs font-bold text-slate-500">Total Biaya PO (Rupiah)</label>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    min="1000"
                    placeholder="Contoh: 12500000"
                    className="w-full py-2.5 px-3 bg-white/80 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none"
                    defaultValue={defaultAmount}
                    required
                  />
                </div>

                {/* Pilih Produk (Opsional / Terkait Restock) */}
                <div className="space-y-1.5">
                  <label htmlFor="productId" className="text-xs font-bold text-slate-500">Pilih Produk Restock (Opsional)</label>
                  <select
                    id="productId"
                    name="productId"
                    className="w-full py-2.5 px-3 bg-white/80 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none cursor-pointer"
                    defaultValue={defaultProductId}
                  >
                    <option value="">-- Hubungkan dengan Produk --</option>
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({prod.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kuantitas Restock */}
                <div className="space-y-1.5">
                  <label htmlFor="quantity" className="text-xs font-bold text-slate-500">Kuantitas Restock</label>
                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    placeholder="Contoh: 50"
                    className="w-full py-2.5 px-3 bg-white/80 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none"
                    defaultValue={50}
                    required
                  />
                </div>
              </div>

              {/* Tombol Kirim */}
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#0B132B] hover:bg-[#1C2541] active:bg-[#0B132B] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingCart className="h-4 w-4 text-teal-400" />
                Kirim Pengajuan PO
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Rincian Antrean Approval */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-[#0B132B] dark:text-zinc-100 flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-650" />
          Antrean Persetujuan Manager (PO PENDING)
        </h2>
        
        {/* Peringatan Otoritas bagi Purchasing */}
        {!isPurchasingOrAdmin && userRole !== "MANAGER" && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl max-w-2xl text-xs font-medium mb-3">
            <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
            <span>Sebagai role <b>{userRole}</b>, Anda hanya dapat melihat daftar ini secara read-only. Pengambilan keputusan (Persetujuan/Penolakan) hanya diizinkan bagi role <b>MANAGER</b> atau <b>SUPERADMIN</b>.</span>
          </div>
        )}

        <POApprovalTable initialPOs={pendingPOs as any} userRole={userRole} />
      </div>
    </div>
  );
}

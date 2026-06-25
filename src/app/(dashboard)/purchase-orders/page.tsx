import { getSession } from "@/lib/auth";
import { getPendingPurchaseOrders, createPurchaseOrder } from "@/app/actions/purchase-order";
import { prisma } from "@/lib/db";
import POApprovalTable from "@/components/po/POApprovalTable";
import OfficialPOForm from "@/components/po/OfficialPOForm";
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
    select: { id: true, name: true, sku: true, buyPrice: true, supplierId: true }
  });

  const serializedProducts = products.map((p) => ({
    ...p,
    buyPrice: Number(p.buyPrice)
  }));

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
        <OfficialPOForm 
          suppliers={activeSuppliers}
          products={serializedProducts}
          defaultSupplierId={defaultSupplierId}
          defaultProductId={defaultProductId}
        />
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

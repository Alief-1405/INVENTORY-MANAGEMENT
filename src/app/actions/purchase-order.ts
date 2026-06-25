"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireServerRole } from "@/lib/rbac";

/**
 * Mendapatkan daftar Purchase Order yang membutuhkan persetujuan
 * Akses terbuka untuk semua pengguna terautentikasi demi tampilan data
 */
export async function getPendingPurchaseOrders() {
  try {
    const pos = await prisma.purchaseOrder.findMany({
      where: {
        status: "PENDING_APPROVAL",
      },
      orderBy: {
        createdAt: "asc", // Tampilkan antrean paling lama dahulu
      },
      include: {
        supplier: {
          select: {
            name: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });

    // Serialisasi data decimal dan tanggal
    const serializedPOs = pos.map((po) => ({
      ...po,
      totalCost: Number(po.totalCost),
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
    }));

    return { success: true, data: serializedPOs };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal mengambil antrean PO." };
  }
}

/**
 * Aksi menyetujui Purchase Order (Hanya MANAGER & SUPERADMIN)
 */
export async function approvePurchaseOrder(poId: string) {
  try {
    // Keamanan tingkat server: Hanya MANAGER dan SUPERADMIN
    const session = await requireServerRole("MANAGER", "SUPERADMIN");

    const result = await prisma.$transaction(async (tx) => {
      // Ambil detail PO saat ini
      const po = await tx.purchaseOrder.findUnique({
        where: { id: poId },
        include: { supplier: true }
      });

      if (!po) throw new Error("Purchase Order tidak ditemukan.");
      if (po.status !== "PENDING_APPROVAL") throw new Error("PO tidak sedang dalam status menunggu persetujuan.");

      // Update status PO ke APPROVED
      const updatedPo = await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: "APPROVED",
          approvedById: session.id,
        },
      });

      // Catat log audit
      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "APPROVE_PURCHASE_ORDER",
          details: `Purchase Order ${po.poNumber} untuk ${po.supplier.name} senilai ${Number(po.totalCost).toLocaleString("id-ID")} disetujui oleh ${session.name}`,
        },
      });

      return updatedPo;
    });

    revalidatePath("/purchase-orders");
    revalidatePath("/");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal menyetujui Purchase Order." };
  }
}

/**
 * Aksi menolak Purchase Order (Hanya MANAGER & SUPERADMIN)
 */
export async function rejectPurchaseOrder(poId: string, notes: string) {
  try {
    if (!notes || notes.trim().length === 0) {
      return { success: false, message: "Catatan penolakan harus diisi." };
    }

    // Keamanan tingkat server: Hanya MANAGER dan SUPERADMIN
    const session = await requireServerRole("MANAGER", "SUPERADMIN");

    const result = await prisma.$transaction(async (tx) => {
      // Ambil detail PO saat ini
      const po = await tx.purchaseOrder.findUnique({
        where: { id: poId },
        include: { supplier: true }
      });

      if (!po) throw new Error("Purchase Order tidak ditemukan.");
      if (po.status !== "PENDING_APPROVAL") throw new Error("PO tidak sedang dalam status menunggu persetujuan.");

      // Update status PO ke REJECTED beserta alasan
      const updatedPo = await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: "REJECTED",
          approvedById: session.id,
          managerNotes: notes,
        },
      });

      // Catat log audit
      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "REJECT_PURCHASE_ORDER",
          details: `Purchase Order ${po.poNumber} untuk ${po.supplier.name} DITOLAK oleh ${session.name}. Alasan: ${notes}`,
        },
      });

      return updatedPo;
    });

    revalidatePath("/purchase-orders");
    revalidatePath("/");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal menolak Purchase Order." };
  }
}

/**
 * Pembuatan PO baru (Hanya PURCHASING & SUPERADMIN) - Sebagai pembantu pengujian alur
 */
export async function createPurchaseOrder(supplierId: string, totalCost: number) {
  try {
    const session = await requireServerRole("PURCHASING", "SUPERADMIN");

    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(count + 1).padStart(4, "0")}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        totalCost,
        supplierId,
        createdById: session.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "CREATE_PURCHASE_ORDER",
        details: `Purchase Order ${poNumber} berhasil dibuat senilai ${totalCost.toLocaleString("id-ID")} menunggu persetujuan Manager.`,
      },
    });

    revalidatePath("/purchase-orders");
    return { success: true, data: po };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal membuat Purchase Order." };
  }
}

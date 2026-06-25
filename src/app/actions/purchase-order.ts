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
        product: {
          select: {
            name: true,
            sku: true,
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
export async function createPurchaseOrder(
  supplierId: string,
  totalCost: number,
  productId?: string,
  quantity?: number
) {
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
        productId: productId || null,
        quantity: quantity || 50,
      },
    });

    let productName = "";
    if (productId) {
      const prod = await prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
      if (prod) productName = ` untuk produk "${prod.name}"`;
    }

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "CREATE_PURCHASE_ORDER",
        details: `Purchase Order ${poNumber}${productName} berhasil dibuat senilai ${totalCost.toLocaleString("id-ID")} menunggu persetujuan Manager.`,
      },
    });

    revalidatePath("/purchase-orders");
    revalidatePath("/procurement-tracking");
    revalidatePath("/");
    return { success: true, data: po };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal membuat Purchase Order." };
  }
}

/**
 * Aksi penerimaan barang oleh GUDANG setelah PO APPROVED tiba di gudang
 */
export async function receivePurchaseOrder(poId: string) {
  try {
    const session = await requireServerRole("GUDANG", "SUPERADMIN");

    const result = await prisma.$transaction(async (tx) => {
      // Ambil detail PO saat ini beserta item-itemnya
      const po = await tx.purchaseOrder.findUnique({
        where: { id: poId },
        include: { 
          supplier: true, 
          product: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });

      if (!po) throw new Error("Purchase Order tidak ditemukan.");
      if (po.status !== "APPROVED") {
        throw new Error("Hanya PO dengan status APPROVED yang dapat diterima.");
      }

      // Update status PO ke RECEIVED
      const updatedPo = await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: "RECEIVED",
        },
      });

      // Tambahkan stok produk jika PO memiliki relasi produk
      if (po.items && po.items.length > 0) {
        for (const item of po.items) {
          const product = item.product;
          if (product) {
            const newStock = product.stock + item.quantity;
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: newStock }
            });

            // Catat pergerakan stok (Mutasi IN)
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: "IN",
                quantity: item.quantity,
                reason: `Penerimaan Restock via PO ${po.poNumber}`,
                userId: session.id
              }
            });

            // Catat Audit Log untuk penambahan stok
            await tx.auditLog.create({
              data: {
                userId: session.id,
                action: "RECEIVE_PURCHASE_ORDER",
                details: `Penerimaan PO ${po.poNumber}. Stok "${product.name}" (${item.productId}) bertambah ${item.quantity} unit. Stok baru: ${newStock}.`
              }
            });
          }
        }
      } else if (po.productId && po.quantity) {
        // Fallback untuk PO format lama (Single-product)
        const product = await tx.product.findUnique({
          where: { id: po.productId }
        });
        if (product) {
          const newStock = product.stock + po.quantity;
          await tx.product.update({
            where: { id: po.productId },
            data: { stock: newStock }
          });

          // Catat pergerakan stok (Mutasi IN)
          await tx.stockMovement.create({
            data: {
              productId: po.productId,
              type: "IN",
              quantity: po.quantity,
              reason: `Penerimaan Restock via PO ${po.poNumber}`,
              userId: session.id
            }
          });

          // Catat Audit Log untuk penambahan stok
          await tx.auditLog.create({
            data: {
              userId: session.id,
              action: "RECEIVE_PURCHASE_ORDER",
              details: `Penerimaan PO ${po.poNumber}. Stok "${product.name}" (${po.productId}) bertambah ${po.quantity} unit. Stok baru: ${newStock}.`
            }
          });
        }
      } else {
        // Catat Audit Log penerimaan umum
        await tx.auditLog.create({
          data: {
            userId: session.id,
            action: "RECEIVE_PURCHASE_ORDER",
            details: `Penerimaan PO ${po.poNumber} untuk ${po.supplier.name} diselesaikan oleh ${session.name}.`
          }
        });
      }

      return updatedPo;
    });

    revalidatePath("/purchase-orders");
    revalidatePath("/procurement-tracking");
    revalidatePath("/movements");
    revalidatePath("/products");
    revalidatePath("/");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal menerima Purchase Order." };
  }
}

/**
 * Mengambil semua Purchase Order untuk pelacakan pengadaan
 */
export async function getPurchaseOrdersForTracking() {
  try {
    const pos = await prisma.purchaseOrder.findMany({
      orderBy: {
        updatedAt: "desc"
      },
      include: {
        supplier: {
          select: { name: true }
        },
        product: {
          select: { name: true, sku: true }
        },
        createdBy: {
          select: { name: true }
        }
      }
    });

    const serializedPOs = pos.map((po) => ({
      ...po,
      totalCost: Number(po.totalCost),
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
    }));

    return { success: true, data: serializedPOs };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal mengambil data pelacakan pengadaan." };
  }
}

/**
 * Pembuatan PO Resmi dengan banyak item barang sekaligus (Multi-Item)
 */
export async function createOfficialPurchaseOrder(
  supplierId: string,
  items: { productId: string; quantity: number; price: number }[]
) {
  try {
    const session = await requireServerRole("PURCHASING", "SUPERADMIN");

    if (!supplierId) {
      return { success: false, message: "Supplier wajib dipilih." };
    }

    if (!items || items.length === 0) {
      return { success: false, message: "Minimal harus ada satu item barang." };
    }

    // Hitung total akumulasi biaya
    const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.purchaseOrder.count();
      const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(count + 1).padStart(4, "0")}`;

      // Buat dokumen PO utama
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          totalCost,
          supplierId,
          createdById: session.id,
          status: "PENDING_APPROVAL",
        },
      });

      // Simpan rincian item detail
      await tx.purchaseOrderItem.createMany({
        data: items.map((item) => ({
          purchaseOrderId: po.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      // Catat log audit
      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "CREATE_PURCHASE_ORDER",
          details: `Purchase Order Resmi ${poNumber} berhasil dibuat dengan ${items.length} item barang senilai Rp ${totalCost.toLocaleString("id-ID")} menunggu persetujuan Manager.`,
        },
      });

      return po;
    });

    revalidatePath("/purchase-orders");
    revalidatePath("/procurement-tracking");
    revalidatePath("/movements");
    revalidatePath("/");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal membuat Purchase Order Resmi." };
  }
}

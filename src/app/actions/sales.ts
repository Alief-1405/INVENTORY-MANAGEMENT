"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireServerRole } from "@/lib/rbac";

/**
 * Membuat Sales Order baru (Khusus SALES & SUPERADMIN)
 */
export async function createSalesOrder(
  customerName: string,
  productId: string,
  quantity: number,
  notes?: string
) {
  try {
    const session = await requireServerRole("SALES", "SUPERADMIN");

    if (!customerName || customerName.trim().length === 0) {
      return { success: false, message: "Nama pelanggan harus diisi." };
    }

    if (quantity <= 0) {
      return { success: false, message: "Kuantitas harus lebih dari 0." };
    }

    // Ambil detail produk untuk verifikasi
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return { success: false, message: "Produk tidak ditemukan." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.salesOrder.count();
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const soNumber = `SO-${dateStr}-${String(count + 1).padStart(4, "0")}`;

      const so = await tx.salesOrder.create({
        data: {
          soNumber,
          customerName,
          productId,
          quantity,
          notes: notes || null,
          createdById: session.id,
          status: "PENDING_PREPARATION"
        }
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "CREATE_SALES_ORDER",
          details: `Sales Order ${soNumber} untuk pelanggan "${customerName}" dibuat oleh ${session.name} (Produk: ${product.name}, Qty: ${quantity})`
        }
      });

      return so;
    });

    revalidatePath("/sales-order");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal membuat Sales Order." };
  }
}

/**
 * Mencari detail Sales Order berdasarkan Nomor SO (Khusus GUDANG & SUPERADMIN)
 */
export async function getSalesOrderDetailsByNo(soNumber: string) {
  try {
    await requireServerRole("GUDANG", "SUPERADMIN");

    if (!soNumber || soNumber.trim().length === 0) {
      return { success: false, message: "Nomor SO tidak boleh kosong." };
    }

    const so = await prisma.salesOrder.findUnique({
      where: { soNumber: soNumber.trim() },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            stock: true,
          }
        },
        createdBy: {
          select: {
            name: true
          }
        },
        deliveryOrder: {
          select: {
            doNumber: true,
            createdAt: true
          }
        }
      }
    });

    if (!so) {
      return { success: false, message: `Sales Order dengan Nomor "${soNumber}" tidak ditemukan.` };
    }

    return { 
      success: true, 
      data: {
        ...so,
        createdAt: so.createdAt.toISOString(),
        updatedAt: so.updatedAt.toISOString(),
        deliveryOrder: so.deliveryOrder ? {
          ...so.deliveryOrder,
          createdAt: so.deliveryOrder.createdAt.toISOString()
        } : null
      } 
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal mengambil detail Sales Order." };
  }
}

/**
 * Konfirmasi Pengeluaran Barang (Dispatch) oleh Gudang (Khusus GUDANG & SUPERADMIN)
 */
export async function confirmDispatch(soId: string) {
  try {
    const session = await requireServerRole("GUDANG", "SUPERADMIN");

    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock/Fetch Sales Order dan detail Produk
      const so = await tx.salesOrder.findUnique({
        where: { id: soId },
        include: { product: true }
      });

      if (!so) throw new Error("Sales Order tidak ditemukan.");
      if (so.status === "DONE") {
        throw new Error(`Barang untuk SO ${so.soNumber} sudah dikeluarkan sebelumnya.`);
      }

      const product = so.product;

      // 2. Cek ketersediaan stok produk di Gudang
      if (product.stock < so.quantity) {
        throw new Error(
          `Gagal! Stok barang "${product.name}" tidak mencukupi. Sisa stok: ${product.stock} unit, sedangkan pesanan: ${so.quantity} unit.`
        );
      }

      const newStock = product.stock - so.quantity;

      // 3. Kurangi stok produk utama
      await tx.product.update({
        where: { id: product.id },
        data: { stock: newStock }
      });

      // 4. Catat mutasi keluar (StockMovement type OUT)
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          type: "OUT",
          quantity: so.quantity,
          reason: `Pengeluaran barang terintegrasi via SO ${so.soNumber}`,
          userId: session.id
        }
      });

      // 5. Generate Nomor DO otomatis
      const doCount = await tx.deliveryOrder.count();
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const doNumber = `DO-${dateStr}-${String(doCount + 1).padStart(4, "0")}`;

      // 6. Buat Surat Jalan / Delivery Order (DO)
      const deliveryOrder = await tx.deliveryOrder.create({
        data: {
          doNumber,
          salesOrderId: so.id,
          confirmedById: session.id
        }
      });

      // 7. Update status SO ke DONE
      await tx.salesOrder.update({
        where: { id: so.id },
        data: { status: "DONE" }
      });

      // 8. Catat Audit Log
      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "CONFIRM_DISPATCH",
          details: `Konfirmasi pengeluaran barang untuk SO ${so.soNumber}. Delivery Order ${doNumber} dibuat. Stok "${product.name}" berkurang ${so.quantity} unit (dari ${product.stock} menjadi ${newStock}).`
        }
      });

      return { deliveryOrder, newStock, product };
    });

    revalidatePath("/dispatch-order");
    revalidatePath("/sales-order");
    revalidatePath("/movements");
    revalidatePath("/products");
    revalidatePath("/");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal mengkonfirmasi pengeluaran barang." };
  }
}

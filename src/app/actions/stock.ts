"use server";

import { prisma } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireServerRole } from "@/lib/rbac";

const stockMovementSchema = z.object({
  productId: z.string().uuid("ID Produk tidak valid"),
  type: z.enum(["IN", "OUT", "TRANSFER"]),
  quantity: z.number().int().positive("Kuantitas harus lebih dari 0"),
  reason: z.string().optional().nullable(),
});

export async function createStockMovement(formData: z.infer<typeof stockMovementSchema>) {
  try {
    const session = await requireServerRole("GUDANG", "SUPERADMIN");
    const validatedData = stockMovementSchema.parse(formData);
    const { productId, type, quantity, reason } = validatedData;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock baris produk untuk mencegah race condition (hanya jalan di Postgres)
      const productRecords = await tx.$queryRaw<
        { id: string; stock: number; name: string }[]
      >`SELECT id, stock, name FROM "Product" WHERE id = ${productId} FOR UPDATE`;

      if (!productRecords || productRecords.length === 0) {
        throw new Error("Produk tidak ditemukan dalam database.");
      }

      const product = productRecords[0];

      // 2. Kalkulasi stok baru
      let newStock = product.stock;
      if (type === "IN") {
        newStock += quantity;
      } else if (type === "OUT" || type === "TRANSFER") {
        if (product.stock < quantity) {
          throw new Error(
            `Gagal! Stok tidak mencukupi untuk "${product.name}". Sisa stok: ${product.stock}`
          );
        }
        newStock -= quantity;
      }

      // 3. Catat pergerakan stok
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type,
          quantity,
          reason: reason || null,
          userId: session.id,
        },
      });

      // 4. Update stok pada produk
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stock: newStock },
      });

      // 5. Catat Audit Log
      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "UPDATE_STOCK",
          details: `Mutasi stok ${type}: Kuantitas ${quantity}. Stok "${product.name}" (${productId}) berubah dari ${product.stock} menjadi ${newStock}. Alasan: ${reason || "-"}`,
        },
      });

      return { movement, updatedProduct };
    });

    // Revalidate halaman terkait
    revalidatePath("/movements");
    revalidatePath("/products");
    revalidatePath("/");

    return { success: true, data: result };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.issues[0].message };
    }
    return { 
      success: false, 
      message: error.message || "Terjadi kesalahan internal server." 
    };
  }
}

export async function getStockMovements() {
  try {
    const movements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    // Mengubah Decimal ke Number (jika ada decimal fields, tapi stockMovement tidak ada, just in case)
    const serializedMovements = movements.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    }));

    return { success: true, data: serializedMovements };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal mengambil riwayat mutasi stok" };
  }
}

/**
 * Mengurangi stok barang (Stock Out) - Khusus GUDANG & SUPERADMIN
 */
export async function updateStockOut(productId: string, quantity: number) {
  try {
    if (quantity <= 0) {
      return { success: false, message: "Kuantitas harus lebih dari 0" };
    }

    const session = await requireServerRole("GUDANG", "SUPERADMIN");

    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock baris produk
      const productRecords = await tx.$queryRaw<
        { id: string; stock: number; minStock: number; name: string }[]
      >`SELECT id, stock, "minStock", name FROM "Product" WHERE id = ${productId} FOR UPDATE`;

      if (!productRecords || productRecords.length === 0) {
        throw new Error("Produk tidak ditemukan.");
      }

      const product = productRecords[0];

      // 2. Cek kecukupan stok
      if (product.stock < quantity) {
        throw new Error(`Stok tidak mencukupi untuk "${product.name}". Sisa stok: ${product.stock}`);
      }

      const newStock = product.stock - quantity;

      // 3. Catat pergerakan stok (Mutasi OUT)
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type: "OUT",
          quantity,
          reason: "Pengurangan stok otomatis (Stock Out)",
          userId: session.id,
        },
      });

      // 4. Update stok pada produk
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stock: newStock },
      });

      // 5. Catat Audit Log
      const isLowStock = newStock <= product.minStock;
      const lowStockMsg = isLowStock ? ` [PERINGATAN: Stok di bawah batas minimum ${product.minStock}]` : "";
      
      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "UPDATE_STOCK_OUT",
          details: `Pengurangan stok barang "${product.name}" (${productId}) sebanyak ${quantity} unit. Sisa stok baru: ${newStock}.${lowStockMsg}`,
        },
      });

      return { movement, updatedProduct, isLowStock, newStock };
    });

    revalidatePath("/movements");
    revalidatePath("/products");
    revalidatePath("/");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message || "Terjadi kesalahan internal server." };
  }
}


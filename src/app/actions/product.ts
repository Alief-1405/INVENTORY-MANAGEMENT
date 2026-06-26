"use server";

import { prisma } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireServerRole } from "@/lib/rbac";

const productSchema = z.object({
  sku: z.string().min(2, "SKU minimal 2 karakter"),
  name: z.string().min(3, "Nama produk minimal 3 karakter"),
  sellPrice: z.number().int().positive("Harga jual harus lebih dari 0"),
  stock: z.number().int().nonnegative("Stok awal tidak boleh negatif"),
  minStock: z.number().int().nonnegative("Stok minimum tidak boleh negatif"),
});

export async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        imageUrl: true,
        buyPrice: true,
        sellPrice: true,
        stock: true,
        minStock: true,
        categoryId: true,
        supplierId: true,
        createdAt: true,
        updatedAt: true,
        category: true,
      }
    });
    // Serialize decimal untuk mencegah warning di client
    const serializedProducts = products.map(p => ({
      ...p,
      buyPrice: Number(p.buyPrice),
      sellPrice: Number(p.sellPrice)
    }));
    
    return { success: true, data: serializedProducts };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal mengambil data produk" };
  }
}

export async function getDashboardStats() {
  try {
    const totalProducts = await prisma.product.count();
    
    const products = await prisma.product.findMany({
      select: { id: true, name: true, sku: true, stock: true, minStock: true, buyPrice: true, sellPrice: true, supplierId: true }
    });

    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
    
    const totalAssetValue = products.reduce((acc, p) => {
      return acc + (p.stock * Number(p.sellPrice));
    }, 0);

    const totalCapitalValue = products.reduce((acc, p) => {
      return acc + (p.stock * Number(p.buyPrice));
    }, 0);

    const estimatedProfit = totalAssetValue - totalCapitalValue;
    const profitMarginPercent = totalAssetValue > 0 ? Math.round((estimatedProfit / totalAssetValue) * 100) : 0;

    const recentAuditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: {
          select: { name: true, role: true }
        }
      }
    });

    const serializedAuditLogs = recentAuditLogs.map(log => ({
      id: log.id,
      time: new Date(log.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }),
      userName: log.user?.name || "System/Deleted User",
      role: log.user?.role || "-",
      action: log.action,
      details: log.details || ""
    }));

    // 1. Produk Kritis (Low Stock) - limit 5 terendah
    const criticalProducts = products
      .filter(p => p.stock <= p.minStock)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);

    // 2. Aktivitas Mutasi Terakhir - limit 5 terbaru
    const recentMovements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        product: {
          select: { name: true, sku: true }
        }
      }
    });

    const serializedRecentActivities = recentMovements.map(m => {
      const diffMs = new Date().getTime() - new Date(m.createdAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      let timeStr = "Baru saja";
      if (diffDays > 0) {
        timeStr = `${diffDays} hari lalu`;
      } else if (diffHours > 0) {
        timeStr = `${diffHours} jam lalu`;
      } else if (diffMins > 0) {
        timeStr = `${diffMins} mnt lalu`;
      }

      return {
        id: m.id,
        time: timeStr,
        product: m.product?.name || "Produk dihapus",
        sku: m.product?.sku || "-",
        type: m.type,
        qty: m.quantity,
        reason: m.reason || "-"
      };
    });

    // 3. Komposisi Kategori
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    const totalProductsCount = products.length || 1;
    const categoryComposition = categories.map(c => ({
      name: c.name,
      value: Math.round((c._count.products / totalProductsCount) * 100)
    })).filter(c => c.value > 0);

    if (categoryComposition.length === 0) {
      categoryComposition.push({ name: "Tanpa Kategori", value: 100 });
    }

    // 4. Tren Mutasi (7 Hari Terakhir)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const movements = await prisma.stockMovement.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo }
      },
      select: { type: true, quantity: true, createdAt: true }
    });

    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const trendMap: { [key: number]: { name: string; IN: number; OUT: number; date: Date } } = {};
    
    // Inisialisasi 7 hari ke belakang secara berurutan
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayName = days[d.getDay()];
      trendMap[d.getDate()] = { name: dayName, IN: 0, OUT: 0, date: d };
    }

    movements.forEach(m => {
      const mDate = new Date(m.createdAt);
      const dateKey = mDate.getDate();
      if (trendMap[dateKey]) {
        if (m.type === "IN") {
          trendMap[dateKey].IN += m.quantity;
        } else if (m.type === "OUT") {
          trendMap[dateKey].OUT += m.quantity;
        }
      }
    });

    const mutationTrend = Object.values(trendMap)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ name, IN, OUT }) => ({ name, IN, OUT }));

    return { 
      success: true, 
      data: {
        totalProducts,
        lowStockCount,
        totalAssetValue,
        totalCapitalValue,
        estimatedProfit,
        profitMarginPercent,
        criticalProducts,
        recentActivities: serializedRecentActivities,
        recentAuditLogs: serializedAuditLogs,
        categoryComposition,
        mutationTrend
      } 
    };
  } catch (error: any) {
    console.error("Dashboard Stats Error:", error);
    return { success: false, message: "Gagal mengambil statistik dashboard: " + error.message };
  }
}

// Server Action untuk membuat produk baru
export async function createProduct(formData: z.infer<typeof productSchema>) {
  try {
    await requireServerRole("GUDANG", "SUPERADMIN");
    const validatedData = productSchema.parse(formData);
    const { sku, name, sellPrice, stock, minStock } = validatedData;

    // Cek apakah SKU sudah digunakan
    const existingProduct = await prisma.product.findUnique({
      where: { sku }
    });
    if (existingProduct) {
      return { success: false, message: `SKU "${sku}" sudah terdaftar.` };
    }

    // Penanganan Kategori Default (Umum)
    let category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({
        data: { name: "Umum", description: "Kategori umum bawaan sistem" }
      });
    }

    // Simpan ke database
    const newProduct = await prisma.product.create({
      data: {
        sku,
        name,
        buyPrice: sellPrice, // buyPrice disamakan dengan sellPrice agar constraint DB terpenuhi
        sellPrice,
        stock,
        minStock,
        categoryId: category.id,
      }
    });

    revalidatePath("/products");
    revalidatePath("/");

    return { success: true, data: newProduct };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.issues[0].message };
    }
    return { success: false, message: error.message || "Gagal membuat produk baru." };
  }
}

// Server Action untuk memperbarui produk
export async function updateProduct(id: string, formData: Partial<z.infer<typeof productSchema>>) {
  try {
    await requireServerRole("GUDANG", "SUPERADMIN");
    // Validasi data masukan secara parsial
    const validatedData = productSchema.partial().parse(formData);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return { success: false, message: "Produk tidak ditemukan." };
    }

    // Jika SKU diubah, pastikan tidak bertabrakan dengan produk lain
    if (validatedData.sku && validatedData.sku !== product.sku) {
      const existingProduct = await prisma.product.findUnique({
        where: { sku: validatedData.sku }
      });
      if (existingProduct) {
        return { success: false, message: `SKU "${validatedData.sku}" sudah terdaftar.` };
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...validatedData,
        // Update buyPrice jika sellPrice berubah agar tetap sinkron
        buyPrice: validatedData.sellPrice !== undefined ? validatedData.sellPrice : undefined,
      }
    });

    revalidatePath("/products");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.issues[0].message };
    }
    return { success: false, message: error.message || "Gagal memperbarui produk." };
  }
}

// Server Action untuk menghapus produk
export async function deleteProduct(id: string) {
  try {
    await requireServerRole("GUDANG", "SUPERADMIN");
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return { success: false, message: "Produk tidak ditemukan." };
    }

    await prisma.product.delete({ where: { id } });

    revalidatePath("/products");
    revalidatePath("/");

    return { 
      success: true, 
      message: "Produk berhasil dihapus." 
    };
  } catch (error: any) {
    return { 
      success: false, 
      message: error.code === "P2003" 
        ? "Gagal menghapus! Produk ini memiliki riwayat mutasi stok terkait." 
        : (error.message || "Gagal menghapus produk.") 
    };
  }
}

/**
 * Mengambil daftar produk dengan stok kritis (stok <= minStock)
 */
export async function getCriticalProducts() {
  try {
    await requireServerRole("PURCHASING", "SUPERADMIN", "MANAGER");

    const products = await prisma.product.findMany({
      include: {
        category: true,
        supplier: true
      },
      orderBy: {
        stock: "asc"
      }
    });

    const critical = products.filter(p => p.stock <= p.minStock);

    return {
      success: true,
      data: critical.map(p => ({
        ...p,
        buyPrice: Number(p.buyPrice),
        sellPrice: Number(p.sellPrice)
      }))
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal mengambil data stok kritis." };
  }
}


import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const { products } = await req.json();
    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, message: "Daftar produk tidak valid atau kosong." },
        { status: 400 }
      );
    }

    // 1. Dapatkan atau buat Kategori Default "Umum"
    let category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({
        data: { name: "Umum", description: "Kategori umum bawaan sistem" },
      });
    }

    // 2. Jalankan transaksi massal upsert untuk setiap produk
    const result = await prisma.$transaction(
      products.map((p: any) => {
        const sku = String(p.sku || "").trim();
        const name = String(p.name || "").trim();
        const sellPrice = Number(p.sellPrice) || 0;
        const stock = parseInt(p.stock, 10) || 0;
        const minStock = parseInt(p.minStock, 10) || 10;

        return prisma.product.upsert({
          where: { sku },
          update: {
            name,
            sellPrice,
            buyPrice: sellPrice, // buyPrice disamakan dengan sellPrice agar constraint DB terpenuhi
            stock,
            minStock,
          },
          create: {
            sku,
            name,
            sellPrice,
            buyPrice: sellPrice,
            stock,
            minStock,
            categoryId: category!.id,
          },
        });
      })
    );

    // 3. Revalidasi cache halaman Next.js
    revalidatePath("/products");
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: `Berhasil menyimpan/memperbarui ${result.length} produk ke database Supabase.`,
      count: result.length,
    });

  } catch (error: any) {
    console.error("Bulk save error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menyimpan produk ke database." },
      { status: 500 }
    );
  }
}

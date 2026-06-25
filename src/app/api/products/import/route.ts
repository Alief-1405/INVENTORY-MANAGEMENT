import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json(
        { success: false, message: "Berkas file tidak ditemukan dalam form data." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawData = xlsx.utils.sheet_to_json<any>(sheet);
    if (rawData.length === 0) {
      return NextResponse.json(
        { success: false, message: "File Excel kosong atau tidak terbaca." },
        { status: 400 }
      );
    }

    const products = rawData.map((row: any) => {
      // Normalisasi nama kolom yang fleksibel
      const sku = String(row.sku || row.SKU || row["Kode Produk"] || row["kode"] || "").trim();
      const name = String(row.name || row.Nama || row["Nama Produk"] || row["nama"] || "").trim();
      const sellPriceRaw = row.sellPrice || row["Harga Jual"] || row.sell_price || row["harga"] || 0;
      const stockRaw = row.stock || row.Stok || row.qty || row["stok"] || 0;
      const minStockRaw = row.minStock || row["Stok Minimum"] || row.min_stock || 10;

      const sellPrice = Number(sellPriceRaw) || 0;
      const stock = parseInt(stockRaw, 10) || 0;
      const minStock = parseInt(minStockRaw, 10) || 10;

      return {
        sku,
        name,
        sellPrice: sellPrice > 0 ? sellPrice : 0,
        stock: stock >= 0 ? stock : 0,
        minStock: minStock >= 0 ? minStock : 10,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil menguraikan ${products.length} data produk.`,
      data: products
    });

  } catch (error: any) {
    console.error("Excel processing error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan saat memproses file Excel." },
      { status: 500 }
    );
  }
}

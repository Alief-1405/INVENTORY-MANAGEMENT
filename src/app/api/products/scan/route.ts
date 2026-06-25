import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json(
        { success: false, message: "File gambar tidak ditemukan dalam form data." },
        { status: 400 }
      );
    }

    const mimeType = file.type;
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    let products: any[] = [];
    let providerUsed = "";

    // 1. Coba gunakan Google Gemini jika tersedia
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                products: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      sku: { type: SchemaType.STRING },
                      name: { type: SchemaType.STRING },
                      sellPrice: { type: SchemaType.NUMBER },
                      stock: { type: SchemaType.NUMBER },
                      minStock: { type: SchemaType.NUMBER },
                    },
                    required: ["sku", "name", "sellPrice", "stock"],
                  },
                },
              },
              required: ["products"],
            },
          },
        });

        const prompt = "Ekstrak daftar produk fisik dari gambar tabel/nota ini. Buat SKU unik berdasar nama/merk produk jika tidak tertulis. Pastikan harga (sellPrice) dan stok (stock) bernilai angka positif.";

        const result = await model.generateContent([
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          prompt,
        ]);

        const text = result.response.text();
        if (text) {
          const parsed = JSON.parse(text);
          products = parsed.products || [];
          providerUsed = "Gemini AI (gemini-1.5-flash)";
        }
      } catch (geminiError: any) {
        console.error("Gemini Scan Error:", geminiError);
        // Jika Gemini gagal, biarkan ia meluncur ke OpenAI jika tersedia
        if (!openaiKey) {
          throw new Error("Gemini AI gagal memproses gambar: " + geminiError.message);
        }
      }
    }

    // 2. Gunakan OpenAI jika kunci tersedia dan Gemini tidak terpilih/gagal
    if (products.length === 0 && openaiKey) {
      const openai = new OpenAI({ apiKey: openaiKey });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Anda adalah asisten AI pergudangan yang handal. Tugas Anda adalah mengekstrak daftar produk dari gambar nota, struk, atau tabel stok fisik.
            Harap kembalikan JSON objek dengan key 'products' berupa array dari item.
            Setiap item harus memiliki field:
            - sku: Buat SKU unik jika tidak tertera di gambar (misal: PROD-101)
            - name: Nama lengkap produk
            - sellPrice: Harga jual per unit
            - stock: Jumlah stok barang awal
            - minStock: Batas minimum stok (default 10 jika tidak diketahui)`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Ekstrak seluruh baris produk dari gambar berikut ke dalam format JSON.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        response_format: {
          type: "json_object",
        },
      });

      const text = response.choices[0].message.content;
      if (text) {
        const parsed = JSON.parse(text);
        products = parsed.products || [];
        providerUsed = "OpenAI (gpt-4o)";
      }
    }

    // 3. Jika tidak ada kunci API
    if (!geminiKey && !openaiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "API Key untuk Gemini AI atau OpenAI belum dikonfigurasi pada file .env di server.",
        },
        { status: 500 }
      );
    }

    if (products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Gagal mengekstrak produk dari gambar. AI tidak menemukan data produk yang jelas.",
        },
        { status: 400 }
      );
    }

    // Normalisasi nilai agar aman untuk UI
    const sanitizedProducts = products.map((p: any) => ({
      sku: String(p.sku || "").trim(),
      name: String(p.name || "").trim(),
      sellPrice: Number(p.sellPrice) || 0,
      stock: parseInt(p.stock, 10) || 0,
      minStock: parseInt(p.minStock, 10) || 10,
    }));

    return NextResponse.json({
      success: true,
      provider: providerUsed,
      data: sanitizedProducts,
    });

  } catch (error: any) {
    console.error("AI Scan route error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan sistem saat memproses AI Vision." },
      { status: 500 }
    );
  }
}

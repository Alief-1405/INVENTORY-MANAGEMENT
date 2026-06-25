import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// GET /api/settings/logo
export async function GET(req: NextRequest) {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "logo_url" },
    });

    return NextResponse.json({ success: true, logoUrl: setting?.value || null });
  } catch (error: any) {
    console.error("GET Logo Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat logo aplikasi." },
      { status: 500 }
    );
  }
}

// POST /api/settings/logo
export async function POST(req: NextRequest) {
  try {
    // 1. Periksa sesi pengguna
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Silakan login kembali." },
        { status: 401 }
      );
    }

    // 2. Parse form data
    const formData = await req.formData();
    const file = formData.get("logo") as File;
    if (!file) {
      return NextResponse.json(
        { success: false, message: "Tidak ada file logo yang dikirim." },
        { status: 400 }
      );
    }

    // Validasi tipe file
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (fileExt !== "png" && fileExt !== "jpg" && fileExt !== "jpeg") {
      return NextResponse.json(
        { success: false, message: "Format file tidak didukung. Gunakan .png atau .jpg/.jpeg." },
        { status: 400 }
      );
    }

    // Validasi ukuran (maks 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "Ukuran file terlalu besar. Maksimal 2 MB." },
        { status: 400 }
      );
    }

    // 3. Cek konfigurasi Supabase
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        {
          success: false,
          message: "Supabase Storage belum dikonfigurasi di file .env. Harap isikan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        },
        { status: 400 }
      );
    }

    // 4. Proses upload ke Supabase Storage
    // Pastikan bucket 'system-assets' sudah ada dan RLS policy terkonfigurasi untuk anonim upload
    try {
      // 1. Buat bucket jika belum ada
      await prisma.$executeRawUnsafe(`
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('system-assets', 'system-assets', true)
        ON CONFLICT (id) DO NOTHING;
      `);

      // 2. Buat kebijakan RLS SELECT jika belum ada
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE tablename = 'objects' 
                AND schemaname = 'storage' 
                AND policyname = 'Allow public select on system-assets'
            ) THEN
                CREATE POLICY "Allow public select on system-assets" 
                ON storage.objects FOR SELECT 
                TO public 
                USING (bucket_id = 'system-assets');
            END IF;
        END
        $$;
      `);

      // 3. Buat kebijakan RLS INSERT jika belum ada
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE tablename = 'objects' 
                AND schemaname = 'storage' 
                AND policyname = 'Allow public insert on system-assets'
            ) THEN
                CREATE POLICY "Allow public insert on system-assets" 
                ON storage.objects FOR INSERT 
                TO public 
                WITH CHECK (bucket_id = 'system-assets');
            END IF;
        END
        $$;
      `);

      // 4. Buat kebijakan RLS UPDATE jika belum ada
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE tablename = 'objects' 
                AND schemaname = 'storage' 
                AND policyname = 'Allow public update on system-assets'
            ) THEN
                CREATE POLICY "Allow public update on system-assets" 
                ON storage.objects FOR UPDATE 
                TO public 
                USING (bucket_id = 'system-assets');
            END IF;
        END
        $$;
      `);
    } catch (bucketError) {
      console.warn("Auto-creating bucket or policy via SQL failed:", bucketError);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `app-logo-${Date.now()}.${fileExt}`;
    const filePath = `logo/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("system-assets")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase Storage Upload Error:", uploadError);
      return NextResponse.json(
        { success: false, message: `Gagal mengunggah ke Supabase Storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 5. Ambil public URL dari berkas yang diunggah
    const { data: publicUrlData } = supabase.storage
      .from("system-assets")
      .getPublicUrl(filePath);

    const logoUrl = publicUrlData.publicUrl;

    // 6. Simpan URL logo ke tabel system_settings menggunakan Prisma
    await prisma.systemSetting.upsert({
      where: { key: "logo_url" },
      update: { value: logoUrl },
      create: { key: "logo_url", value: logoUrl },
    });

    return NextResponse.json({
      success: true,
      message: "Logo aplikasi berhasil diperbarui.",
      logoUrl,
    });
  } catch (error: any) {
    console.error("POST Logo Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan internal." },
      { status: 500 }
    );
  }
}

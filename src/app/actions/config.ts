"use server";

import { prisma } from "@/lib/db";
import { requireServerRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

/**
 * Memperbarui nama perusahaan / PT dalam tabel AppConfig.
 * Hanya dapat dipanggil oleh user dengan role SUPERADMIN.
 */
export async function updateCompanyName(name: string) {
  try {
    // 1. Otorisasi server-side: hanya SUPERADMIN
    await requireServerRole("SUPERADMIN");

    if (!name || name.trim() === "") {
      return { success: false, message: "Nama perusahaan tidak boleh kosong." };
    }

    const trimmedName = name.trim();

    // 2. Cari konfigurasi pertama, atau buat jika belum ada
    const config = await prisma.appConfig.findFirst();

    if (config) {
      await prisma.appConfig.update({
        where: { id: config.id },
        data: { companyName: trimmedName },
      });
    } else {
      await prisma.appConfig.create({
        data: { companyName: trimmedName },
      });
    }

    // 3. Revalidasi path root layout agar perubahan nama PT merata di seluruh halaman
    revalidatePath("/", "layout");

    return { success: true, message: "Nama perusahaan berhasil diperbarui." };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Gagal memperbarui nama perusahaan.",
    };
  }
}

/**
 * Mengambil nama perusahaan saat ini.
 */
export async function getCompanyName() {
  try {
    const config = await prisma.appConfig.findFirst();
    return config?.companyName || "Sistem Inventaris";
  } catch (error) {
    return "Sistem Inventaris";
  }
}

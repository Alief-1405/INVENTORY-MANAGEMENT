"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireServerRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

const userSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.nativeEnum(Role),
});

/**
 * Superadmin mendaftarkan karyawan baru
 */
export async function createNewUserByAdmin(data: z.infer<typeof userSchema>) {
  try {
    // 1. Otorisasi server-side: hanya SUPERADMIN
    const session = await requireServerRole("SUPERADMIN");

    // 2. Validasi input
    const parsedData = userSchema.parse(data);

    // 3. Cek apakah email sudah ada
    const existingUser = await prisma.user.findUnique({
      where: { email: parsedData.email },
    });

    if (existingUser) {
      return { success: false, message: "Email sudah terdaftar." };
    }

    // 4. Hash password default
    const hashedPassword = await bcrypt.hash(parsedData.password, 10);

    // 5. Simpan user ke database
    const newUser = await prisma.user.create({
      data: {
        name: parsedData.name,
        email: parsedData.email,
        password: hashedPassword,
        role: parsedData.role,
        isActive: true,
      },
    });

    // 6. Catat audit log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "CREATE_USER_BY_ADMIN",
        details: `Superadmin ${session.name} mendaftarkan karyawan baru: ${newUser.name} (${newUser.email}) dengan role ${newUser.role}.`,
      },
    });

    revalidatePath("/superadmin/manage-users");
    return { success: true, data: { id: newUser.id, name: newUser.name, email: newUser.email } };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.issues[0].message };
    }
    return { 
      success: false, 
      message: error.message || "Unauthorized: Hanya Superadmin yang berhak mendaftarkan akun baru!" 
    };
  }
}

/**
 * Mengambil seluruh daftar karyawan (Hanya SUPERADMIN)
 */
export async function getUsers() {
  try {
    await requireServerRole("SUPERADMIN");

    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Serialisasi tanggal untuk Client Component
    const serializedUsers = users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
    }));

    return { success: true, data: serializedUsers };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal mengambil daftar pengguna." };
  }
}

/**
 * Superadmin mereset password karyawan
 */
export async function resetUserPassword(userId: string, passwordBaru: string) {
  try {
    const session = await requireServerRole("SUPERADMIN");

    if (!passwordBaru || passwordBaru.trim().length < 6) {
      return { success: false, message: "Password minimal harus 6 karakter." };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, message: "Karyawan tidak ditemukan." };
    }

    const hashedPassword = await bcrypt.hash(passwordBaru, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "RESET_USER_PASSWORD",
        details: `Superadmin ${session.name} me-reset password untuk karyawan: ${user.name} (${user.email}).`,
      },
    });

    revalidatePath("/superadmin/manage-users");
    return { success: true, message: "Password berhasil di-reset." };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal mereset password." };
  }
}

/**
 * Superadmin menonaktifkan atau mengaktifkan akun karyawan
 */
export async function toggleUserStatus(userId: string) {
  try {
    const session = await requireServerRole("SUPERADMIN");

    // Mencegah superadmin mengunci akunnya sendiri
    if (userId === session.id) {
      return { success: false, message: "Anda tidak dapat menonaktifkan akun Anda sendiri!" };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, message: "Karyawan tidak ditemukan." };
    }

    const newStatus = !user.isActive;

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: newStatus },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "TOGGLE_USER_STATUS",
        details: `Superadmin ${session.name} mengubah status akun ${user.name} (${user.email}) menjadi ${newStatus ? "AKTIF" : "NONAKTIF"}.`,
      },
    });

    revalidatePath("/superadmin/manage-users");
    return { success: true, data: { isActive: newStatus } };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal mengubah status akun." };
  }
}

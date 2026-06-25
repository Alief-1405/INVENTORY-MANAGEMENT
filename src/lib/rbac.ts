import { getSession } from "@/lib/auth";
import { Role } from "@prisma/client";

/**
 * Validasi session dan role pengguna di sisi server.
 * Melempar Error jika user tidak memiliki role yang diizinkan.
 * Mengembalikan data session jika valid.
 */
export async function requireServerRole(...allowedRoles: Role[]) {
  const session = await getSession();
  
  if (!session || !session.id) {
    throw new Error("Sesi tidak valid. Harap login kembali.");
  }

  const userRole = session.role as Role;

  if (!allowedRoles.includes(userRole)) {
    throw new Error(`Akses ditolak: Anda tidak memiliki izin untuk melakukan aksi ini.`);
  }

  return session;
}

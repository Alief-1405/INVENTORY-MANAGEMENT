"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  role: z.enum(["SUPERADMIN", "PURCHASING", "SALES", "GUDANG", "MANAGER"]),
});

export async function loginUser(formData: z.infer<typeof loginSchema>) {
  try {
    const { email, password } = loginSchema.parse(formData);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: false, message: "Email tidak ditemukan" };
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { success: false, message: "Password salah" };
    }

    const sessionData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const sessionToken = await encrypt(sessionData);

    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return { success: true };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.issues[0].message };
    }
    return { success: false, message: "Terjadi kesalahan pada sistem" };
  }
}

export async function registerUser(formData: z.infer<typeof registerSchema>) {
  try {
    const { name, email, password, role } = registerSchema.parse(formData);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { success: false, message: "Email sudah terdaftar" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    const sessionData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const sessionToken = await encrypt(sessionData);

    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return { success: true };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.issues[0].message };
    }
    return { success: false, message: "Terjadi kesalahan pada sistem" };
  }
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  return { success: true };
}

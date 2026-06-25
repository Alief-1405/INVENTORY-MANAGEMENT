import { NextRequest, NextResponse } from "next/server";
import { getSession, encrypt } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
});

// GET /api/user/profile
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Silakan login kembali." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error("GET Profile Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan internal." },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Silakan login kembali." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email } = parsed.data;

    // Cek apakah email sudah terdaftar untuk user lain
    const emailExists = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: session.id },
      },
    });

    if (emailExists) {
      return NextResponse.json(
        { success: false, message: "Email sudah digunakan oleh pengguna lain." },
        { status: 400 }
      );
    }

    // Update profil di database
    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: { name, email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Perbarui session cookie agar sinkron
    const sessionData = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
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

    return NextResponse.json({
      success: true,
      message: "Profil berhasil diperbarui.",
      data: updatedUser,
    });
  } catch (error: any) {
    console.error("PUT Profile Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan internal." },
      { status: 500 }
    );
  }
}

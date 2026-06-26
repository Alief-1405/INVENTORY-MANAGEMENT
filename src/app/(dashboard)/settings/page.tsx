import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { UnifiedSettingsForm } from "./unified-settings-form";

export const metadata = {
  title: "Pengaturan Aplikasi | Inventory Management",
  description: "Kelola profil pribadi dan konfigurasi sistem aplikasi",
};

export default async function SettingsPage() {
  // 1. Ambil session aktif dari cookies
  const session = await getSession();

  // Jika tidak login, arahkan ke login page
  if (!session || !session.id) {
    redirect("/login");
  }

  // 2. Load data user profil dari DB secara real-time
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
    redirect("/login");
  }

  // 3. Load nama perusahaan dari DB
  let initialCompanyName = "Sistem Inventaris";
  try {
    const config = await prisma.appConfig.findFirst();
    if (config?.companyName) {
      initialCompanyName = config.companyName;
    }
  } catch (error) {
    console.error("Gagal mengambil AppConfig dari database:", error);
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0B132B] dark:text-zinc-50">
          Pengaturan Aplikasi
        </h1>
        <p className="text-slate-500 dark:text-zinc-400 text-sm">
          Kelola informasi profil pribadi Anda dan sesuaikan identitas visual serta nama perusahaan.
        </p>
      </div>

      {/* Form terpadu dengan Tabs layout */}
      <UnifiedSettingsForm 
        user={user} 
        initialCompanyName={initialCompanyName} 
      />
    </div>
  );
}

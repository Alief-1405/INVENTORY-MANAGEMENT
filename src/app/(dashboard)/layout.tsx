import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getSession } from "@/lib/auth";
import { IdleTimeout } from "@/components/auth/idle-timeout";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  // Ambil data nama perusahaan dari database secara server-side
  let companyName = "Sistem Inventaris";
  try {
    const config = await prisma.appConfig.findFirst();
    if (config?.companyName) {
      companyName = config.companyName;
    }
  } catch (error) {
    console.error("Gagal mengambil AppConfig dari database:", error);
  }
  
  return (
    <div className="flex h-screen overflow-hidden bg-[#FAF9F5] dark:bg-zinc-950">
      {/* Deteksi Idle Timeout Global (15 Menit) */}
      <IdleTimeout timeoutMinutes={15} />
      
      <Sidebar role={session?.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header 
          userName={session?.name || "User"} 
          userRole={session?.role} 
          companyName={companyName} 
        />
        <main className="flex-1 overflow-y-auto bg-[#FAF9F5] p-8 dark:bg-zinc-900/50 transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}

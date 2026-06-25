import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF9F5] p-4 relative overflow-hidden">
      {/* Vibrant Mesh Gradient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Lingkaran Ungu */}
        <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-purple-400/35 via-fuchsia-300/25 to-transparent blur-[120px] animate-pulse duration-[15s]" />
        {/* Lingkaran Teal */}
        <div className="absolute -bottom-[10%] -right-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-teal-350/35 via-cyan-350/25 to-transparent blur-[120px] animate-pulse duration-[18s]" />
        {/* Lingkaran Jingga Lembut */}
        <div className="absolute top-[30%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-amber-300/20 via-orange-300/15 to-transparent blur-[130px] animate-pulse duration-[12s]" />
      </div>
      
      <div className="z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

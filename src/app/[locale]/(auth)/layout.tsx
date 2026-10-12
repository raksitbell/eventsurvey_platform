import AuthGuard from "@/components/auth/AuthGuard";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard area="guest">
      <div className="relative z-1 min-h-dvh bg-white dark:bg-gray-900">
        <div className="absolute end-4 top-4 z-50 sm:end-6 sm:top-6">
          <LanguageSwitcher />
        </div>
        <div className="relative flex min-h-dvh w-full flex-col lg:flex-row lg:items-stretch">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}

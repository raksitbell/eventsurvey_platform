import { useSidebar } from "@/context/SidebarContext";
import type React from "react";

const Backdrop: React.FC = () => {
  const { isMobileOpen, closeMobileSidebar } = useSidebar();

  if (!isMobileOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-gray-900/50 xl:hidden"
      onClick={() => closeMobileSidebar(true)}
    />
  );
};

export default Backdrop;

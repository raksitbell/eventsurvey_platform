// Adapted from TailAdmin free-nextjs-admin-dashboard src/components/ui/table.
import type { ReactNode } from "react";
interface TableProps {
  children: ReactNode;
  className?: string;
}
export default function Table({ children, className = "" }: TableProps) {
  return <table className={`min-w-full ${className}`}>{children}</table>;
}
export function TableHeader({ children, className }: TableProps) {
  return <thead className={className}>{children}</thead>;
}
export function TableBody({ children, className }: TableProps) {
  return <tbody className={className}>{children}</tbody>;
}
export function TableRow({ children, className }: TableProps) {
  return <tr className={className}>{children}</tr>;
}
export function TableCell({
  children,
  className,
  isHeader = false,
  colSpan,
}: TableProps & { isHeader?: boolean; colSpan?: number }) {
  const CellTag = isHeader ? "th" : "td";
  return (
    <CellTag
      scope={isHeader ? "col" : undefined}
      className={className}
      colSpan={colSpan}
    >
      {children}
    </CellTag>
  );
}

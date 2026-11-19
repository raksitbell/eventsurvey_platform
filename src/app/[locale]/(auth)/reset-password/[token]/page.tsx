import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = { referrer: "no-referrer" };

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function ResetPasswordPage({ params }: PageProps) {
  const { token } = await params;
  return <ResetPasswordForm token={token} />;
}

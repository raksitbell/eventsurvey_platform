import SetupPasswordForm from "@/components/auth/SetupPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = { referrer: "no-referrer" };

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function SetupPasswordPage({ params }: PageProps) {
  const { userId } = await params;
  return <SetupPasswordForm userId={userId} />;
}

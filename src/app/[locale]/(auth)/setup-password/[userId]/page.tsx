import SetupPasswordForm from "@/components/auth/SetupPasswordForm";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function SetupPasswordPage({ params }: PageProps) {
  const { userId } = await params;
  return <SetupPasswordForm userId={userId} />;
}

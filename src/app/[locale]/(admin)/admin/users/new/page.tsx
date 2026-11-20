import CreateUserForm from "@/components/admin/users/CreateUserForm";
import { canCreatePublicDemoTrial } from "@/services/auth/public-demo";
import { getTranslations } from "next-intl/server";

export default async function AdminCreateUserPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const [{ from }, t] = await Promise.all([searchParams, getTranslations()]);
  const isTrial = from === "trial-accounts";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
          {t(isTrial ? "platformConfiguration.addTrialAccount" : "adminUsers.form.createTitle")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t(isTrial ? "platformConfiguration.trialLoginVisibility" : "adminUsers.form.subtitle")}
        </p>
      </div>
      <CreateUserForm
        key={isTrial ? "trial" : "regular"}
        isTrial={isTrial}
        allowPublicDemoPassword={isTrial && canCreatePublicDemoTrial()}
      />
    </div>
  );
}

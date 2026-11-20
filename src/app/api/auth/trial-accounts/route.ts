import { authJson } from "@/core/auth/route-response";
import { listLoginTrialAccounts } from "@/services/auth/trial-accounts";
import type { LoginTrialAccountsResponse } from "@/types/auth";

export async function GET() {
  try {
    return authJson<LoginTrialAccountsResponse>({
      accounts: await listLoginTrialAccounts(),
    });
  } catch {
    return authJson({ error: "TRIAL_ACCOUNTS_UNAVAILABLE" }, 503);
  }
}

import { issueVerifiedSession } from "@/core/auth/verified-session";
import { loginWithMockCredentials } from "@/services/auth/login";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 400 },
      );
    }

    const result = await loginWithMockCredentials(email, password);

    if (!result.ok) {
      const status = result.error === "UNSUPPORTED_ROLE" ? 403 : 401;
      return NextResponse.json({ error: result.error }, { status });
    }

    const response = NextResponse.json({ user: result.user });
    issueVerifiedSession(response, result.user.id);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** Read only a matching password the browser is willing to autofill for this origin. */
export async function getSavedPassword(
  email: string,
  signal: AbortSignal,
): Promise<string | null> {
  if (!("PasswordCredential" in globalThis) || !navigator.credentials?.get)
    return null;

  // DOM typings cover public-key credentials but omit the password option.
  const options: CredentialRequestOptions & { password: true } = {
    password: true,
    mediation: "silent",
    signal,
  };
  try {
    const credential = await navigator.credentials.get(options);
    if (credential?.type !== "password" || credential.id !== email) return null;
    return "password" in credential && typeof credential.password === "string"
      ? credential.password
      : null;
  } catch {
    return null;
  }
}

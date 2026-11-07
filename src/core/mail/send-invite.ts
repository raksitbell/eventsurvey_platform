import nodemailer from "nodemailer";

function appBaseUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function mailConfig() {
  const host = process.env.MAIL_HOST ?? process.env.SMTP_HOST;
  const port = Number(process.env.MAIL_PORT ?? process.env.SMTP_PORT ?? 465);
  const user = process.env.MAIL_USERNAME ?? process.env.SMTP_USER;
  const pass = process.env.MAIL_PASSWORD ?? process.env.SMTP_PASS;
  const fromAddress =
    process.env.MAIL_FROM_ADDRESS ?? process.env.SMTP_FROM ?? user;
  const fromName = process.env.MAIL_FROM_NAME ?? process.env.APP_NAME ?? "EventSurvey";

  if (!host || !user || !pass || !fromAddress) {
    throw new Error("MAIL_NOT_CONFIGURED");
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from: `"${fromName}" <${fromAddress}>`,
  };
}

/** Send bilingual (TH + EN) setup-password invite to a new Event Admin. */
export async function sendSetupPasswordInvite(input: {
  to: string;
  displayName: string;
  userId: string;
  /** Thai title — used in the TH section (falls back to English / slug). */
  eventTitleTh?: string | null;
  /** English title — used in the EN section (falls back to Thai / slug). */
  eventTitleEn?: string | null;
  /** Optional slug / single-title fallback when both language titles are empty. */
  eventTitleFallback?: string | null;
}): Promise<void> {
  const config = mailConfig();
  const setupUrl = `${appBaseUrl()}/setup-password/${input.userId}`;

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  const thRaw = input.eventTitleTh?.trim() ?? "";
  const enRaw = input.eventTitleEn?.trim() ?? "";
  const fallback = input.eventTitleFallback?.trim() || "EventSurvey";
  const eventTitleTh = thRaw || enRaw || fallback;
  const eventTitleEn = enRaw || thRaw || fallback;

  const name = escapeHtml(input.displayName);
  const safeTitleTh = escapeHtml(eventTitleTh);
  const safeTitleEn = escapeHtml(eventTitleEn);
  const safeUrl = escapeHtml(setupUrl);
  const subjectTitle =
    eventTitleTh === eventTitleEn
      ? eventTitleTh
      : `${eventTitleTh} / ${eventTitleEn}`;

  await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: `ตั้งรหัสผ่าน / Set your password — ${subjectTitle}`,
    text: [
      `สวัสดี ${input.displayName} / Hello ${input.displayName}`,
      "",
      "— ภาษาไทย —",
      `คุณได้รับเชิญเป็นผู้ดูแลอีเวนต์ของ "${eventTitleTh}" บน EventSurvey`,
      "กรุณาตั้งรหัสผ่านเพื่อเข้าใช้งานพื้นที่จัดการอีเวนต์:",
      setupUrl,
      "ลิงก์นี้ใช้ได้จนกว่าคุณจะตั้งรหัสผ่านเรียบร้อย",
      "หากคุณไม่ได้คาดหวังอีเมลนี้ สามารถเพิกเฉยได้",
      "",
      "— English —",
      `You have been invited as Event Admin for "${eventTitleEn}" on EventSurvey.`,
      "Please set your password to access the event workspace:",
      setupUrl,
      "This link remains valid until you finish setting your password.",
      "If you did not expect this email, you can ignore it.",
    ].join("\n"),
    html: buildInviteHtml({
      name,
      eventTitleTh: safeTitleTh,
      eventTitleEn: safeTitleEn,
      setupUrl: safeUrl,
    }),
  });
}

function buildInviteHtml(input: {
  name: string;
  eventTitleTh: string;
  eventTitleEn: string;
  setupUrl: string;
}): string {
  // brand-500 ≈ #465fff — table + inline CSS for email clients
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ตั้งรหัสผ่าน / Set password — EventSurvey</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background-color:#465fff;padding:28px 32px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.75);">EventSurvey</p>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.35;font-weight:700;color:#ffffff;">ยินดีต้อนรับ · Welcome</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">ภาษาไทย</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937;">
                สวัสดี <strong style="color:#111827;">${input.name}</strong>
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#4b5563;">
                คุณได้รับเชิญให้เป็น <strong style="color:#3641f5;">ผู้ดูแลอีเวนต์</strong>
                ของอีเวนต์
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#9ca3af;">อีเวนต์</p>
                    <p style="margin:0;font-size:17px;font-weight:700;line-height:1.4;color:#111827;">${input.eventTitleTh}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4b5563;">
                กดปุ่มด้านล่างเพื่อตั้งรหัสผ่าน แล้วเข้าใช้งานพื้นที่จัดการอีเวนต์ได้ทันที
              </p>

              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />

              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">English</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937;">
                Hello <strong style="color:#111827;">${input.name}</strong>
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#4b5563;">
                You have been invited as <strong style="color:#3641f5;">Event Admin</strong>
                for this event.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#9ca3af;">Event</p>
                    <p style="margin:0;font-size:17px;font-weight:700;line-height:1.4;color:#111827;">${input.eventTitleEn}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4b5563;">
                Click the button below to set your password and open the event workspace.
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center" style="border-radius:10px;background-color:#465fff;">
                    <a href="${input.setupUrl}" target="_blank" rel="noopener noreferrer"
                      style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                      ตั้งรหัสผ่าน / Set password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:12px;line-height:1.55;color:#9ca3af;">
                หากปุ่มใช้งานไม่ได้ / If the button does not work, copy this link:
              </p>
              <p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all;">
                <a href="${input.setupUrl}" style="color:#465fff;text-decoration:underline;">${input.setupUrl}</a>
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;" />
              <p style="margin:0;font-size:12px;line-height:1.55;color:#9ca3af;">
                ลิงก์นี้ใช้ได้จนกว่าคุณจะตั้งรหัสผ่านเรียบร้อย · This link remains valid until you set your password.<br />
                หากไม่ได้คาดหวังอีเมลนี้ สามารถเพิกเฉยได้ · If you did not expect this email, you can ignore it.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;background-color:#fafafa;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:11px;line-height:1.5;color:#9ca3af;text-align:center;">
                © EventSurvey · Event &amp; survey platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

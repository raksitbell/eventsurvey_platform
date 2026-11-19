import { issueResetPasswordToken } from "@/core/auth/reset-password-token";
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
  const fromName =
    process.env.MAIL_FROM_NAME ?? process.env.APP_NAME ?? "EventSurvey";

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

/** Send a bilingual reset-password email in the same layout as the invite mail. */
export async function sendPasswordResetEmail(input: {
  to: string;
  displayName: string;
  userId: string;
  password: string;
}): Promise<void> {
  const config = mailConfig();
  const token = issueResetPasswordToken(input.userId, input.password);
  const resetUrl = `${appBaseUrl()}/reset-password/${token}`;

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  const name = escapeHtml(input.displayName);
  const safeUrl = escapeHtml(resetUrl);

  await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: "รีเซ็ตรหัสผ่าน / Reset your password — EventSurvey",
    text: [
      `สวัสดี ${input.displayName} / Hello ${input.displayName}`,
      "",
      "— ภาษาไทย —",
      "เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี EventSurvey ของคุณ",
      "กดลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:",
      resetUrl,
      "ลิงก์นี้ไม่มีวันหมดอายุ แต่จะใช้ไม่ได้หลังจากคุณเปลี่ยนรหัสผ่านแล้ว",
      "หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน สามารถเพิกเฉยต่ออีเมลนี้ได้",
      "",
      "— English —",
      "We received a password reset request for your EventSurvey account.",
      "Use the link below to set a new password:",
      resetUrl,
      "This link does not expire, but it stops working after you change your password.",
      "If you did not request a reset, you can ignore this email.",
    ].join("\n"),
    html: buildResetHtml({ name, resetUrl: safeUrl }),
  });
}

function buildResetHtml(input: { name: string; resetUrl: string }): string {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>รีเซ็ตรหัสผ่าน / Reset password — EventSurvey</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background-color:#465fff;padding:28px 32px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.75);">EventSurvey</p>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.35;font-weight:700;color:#ffffff;">รีเซ็ตรหัสผ่าน · Reset password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">ภาษาไทย</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937;">
                สวัสดี <strong style="color:#111827;">${input.name}</strong>
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4b5563;">
                เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี EventSurvey ของคุณ
                กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่
              </p>

              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />

              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">English</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937;">
                Hello <strong style="color:#111827;">${input.name}</strong>
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4b5563;">
                We received a password reset request for your EventSurvey account.
                Click the button below to set a new password.
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center" style="border-radius:10px;background-color:#465fff;">
                    <a href="${input.resetUrl}" target="_blank" rel="noopener noreferrer"
                      style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
                      ตั้งรหัสผ่านใหม่ / Set new password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:12px;line-height:1.55;color:#9ca3af;">
                หากปุ่มใช้งานไม่ได้ / If the button does not work, copy this link:
              </p>
              <p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all;">
                <a href="${input.resetUrl}" style="color:#465fff;text-decoration:underline;">${input.resetUrl}</a>
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;" />
              <p style="margin:0;font-size:12px;line-height:1.55;color:#9ca3af;">
                ลิงก์นี้ไม่มีวันหมดอายุ แต่จะใช้ไม่ได้หลังจากคุณเปลี่ยนรหัสผ่านแล้ว · This link does not expire, but it stops working after you change your password.<br />
                หากไม่ได้ขอรีเซ็ตรหัสผ่าน สามารถเพิกเฉยได้ · If you did not request a reset, you can ignore this email.
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

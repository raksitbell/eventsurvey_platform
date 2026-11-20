import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot password | EventSurvey",
  description: "Request a password reset link for your EventSurvey account",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}

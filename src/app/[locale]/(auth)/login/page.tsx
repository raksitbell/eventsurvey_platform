import LoginForm from "@/components/auth/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Event Surway",
  description: "Sign in to Event Surway",
};

export default function LoginPage() {
  return <LoginForm />;
}

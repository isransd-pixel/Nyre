import { findValidInvite } from "@/lib/workspaces";
import { AuthForm } from "../auth-form";

export default async function RegisterPage({ searchParams }: PageProps<"/registro">) {
  const { invitacion } = await searchParams;
  const invite = typeof invitacion === "string" ? findValidInvite(invitacion) : undefined;
  return (
    <AuthForm mode="register" invite={invite?.token} inviteName={invite?.workspace.name} />
  );
}

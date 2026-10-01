import { AuthForm } from "../auth-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { invitacion, next } = await searchParams;
  const invite = typeof invitacion === "string" ? invitacion : undefined;
  return (
    <AuthForm
      mode="login"
      invite={invite}
      next={invite ? `/invitacion/${invite}` : typeof next === "string" ? next : undefined}
    />
  );
}

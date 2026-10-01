import Link from "next/link";
import { joinWorkspaceAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { findValidInvite } from "@/lib/workspaces";

export default async function InvitePage({ params }: PageProps<"/invitacion/[token]">) {
  const { token } = await params;
  const invite = findValidInvite(token);
  const user = await getCurrentUser();

  if (!invite) {
    return (
      <Card className="text-center">
        <p>Esta invitación no existe o ya venció.</p>
        <p className="mt-1 text-sm text-muted">Pide a quien te invitó que genere otro enlace.</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 text-center">
      <p>
        Te invitaron a <strong>{invite.workspace.name}</strong>.
      </p>
      {user ? (
        <form action={joinWorkspaceAction.bind(null, token)}>
          <SubmitButton pendingText="Uniéndote…">Unirme como {user.name}</SubmitButton>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <Link className={buttonClass.primary} href={`/registro?invitacion=${token}`}>
            Crear cuenta
          </Link>
          <Link className={buttonClass.secondary} href={`/login?invitacion=${token}`}>
            Ya tengo cuenta
          </Link>
        </div>
      )}
    </Card>
  );
}

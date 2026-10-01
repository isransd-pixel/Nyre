const DEV_SECRET = "dev-only-secret-change-me-dev-only-secret";

/** Secreto de la app para firmar sesiones y cifrar llaves. */
export function appSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Define SESSION_SECRET (mínimo 32 caracteres) en el entorno.");
  }
  return DEV_SECRET;
}

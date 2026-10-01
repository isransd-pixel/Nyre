export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-3xl font-semibold tracking-tight">Nyre</div>
          <p className="mt-1 text-sm text-muted">Las finanzas de tu familia y de tu SaaS</p>
        </div>
        {children}
      </div>
    </main>
  );
}

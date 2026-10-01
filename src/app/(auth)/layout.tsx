import { House, PiggyBank, Rocket } from "lucide-react";

const FEATURES = [
  { Icon: House, title: "La casa", text: "Cuánto entra, cuánto sale y en qué se va." },
  { Icon: Rocket, title: "Tu SaaS", text: "MRR, cancelaciones y valor por cliente con Stripe." },
  { Icon: PiggyBank, title: "Sin complicaciones", text: "Sube el CSV del banco y se clasifica solo." },
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-4xl items-center gap-10 md:grid-cols-2">
        <div>
          <div className="text-4xl font-semibold tracking-tight">Nyre</div>
          <p className="mt-2 text-lg text-muted">Las finanzas de tu familia y de tu SaaS, en un solo lugar y fáciles de entender.</p>
          <ul className="mt-8 hidden flex-col gap-5 md:flex">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <f.Icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-medium">{f.title}</span>
                  <span className="text-sm text-muted">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="w-full max-w-sm justify-self-center">{children}</div>
      </div>
    </main>
  );
}

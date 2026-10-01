import { BellRing, House, PiggyBank, Rocket, ThumbsUp } from "lucide-react";

const FEATURES = [
  { Icon: House, title: "La casa", text: "Cuánto entra, cuánto sale y en qué se va." },
  { Icon: BellRing, title: "Sin sorpresas", text: "Pagos fijos con aviso antes de que venzan." },
  { Icon: Rocket, title: "Tu SaaS", text: "MRR, cancelaciones y valor por cliente con Stripe." },
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="bg-hero relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full border-[60px] border-white/5" />
        <div aria-hidden className="pointer-events-none absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex items-center gap-3 text-xl font-semibold">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <PiggyBank className="h-5 w-5" aria-hidden />
          </span>
          Kipu
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Las finanzas de tu familia, claras como nunca.
          </h1>
          <p className="mt-4 text-lg text-white/80">
            Una frase te dice cómo vas. Una barra te dice en qué se fue. Y te avisamos antes de que algo venza.
          </p>

          {/* Vista previa de cómo se ve el resumen */}
          <div className="mt-10 rounded-3xl bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <ThumbsUp className="h-4 w-4" aria-hidden /> ¡Vas muy bien!
            </div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">$12,369</div>
            <div className="text-sm text-white/70">te quedaron este mes</div>
            <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              <div className="w-[65%] bg-white/40" />
              <div className="w-[35%] bg-white" />
            </div>
          </div>
        </div>

        <ul className="relative grid gap-4 xl:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex gap-3 xl:flex-col xl:gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <f.Icon className="h-4 w-4" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold">{f.title}</span>
                <span className="text-sm text-white/70">{f.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-center justify-center px-4 py-12 sm:px-8">
        <div className="mb-8 flex flex-col items-center text-center lg:hidden">
          <span className="bg-brand inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-glow">
            <PiggyBank className="h-6 w-6" aria-hidden />
          </span>
          <div className="mt-3 text-2xl font-semibold tracking-tight">Kipu</div>
          <p className="mt-1 text-sm text-muted">Las finanzas de tu familia y de tu SaaS</p>
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </section>
    </main>
  );
}

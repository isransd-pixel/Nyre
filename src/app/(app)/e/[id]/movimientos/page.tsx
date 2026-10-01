import { CategoryIcon } from "@/components/category-icon";
import { MonthPicker } from "@/components/month-picker";
import { buttonClass, Card, Input, Select } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { isMonth, shortDate, today } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getCategories, getTransactions } from "@/lib/queries";
import { AddTransactionForm } from "./add-form";
import { CategorySelect, DeleteTransaction } from "./row-controls";

const SOURCE = { manual: "Manual", csv: "CSV", stripe: "Stripe" };

export default async function TransactionsPage({ params, searchParams }: PageProps<"/e/[id]/movimientos">) {
  const { id } = await params;
  const sp = await searchParams;
  const { workspace } = await requireWorkspace(Number(id));
  const now = today();
  const currentMonth = now.slice(0, 7);
  const month = isMonth(sp.mes) && sp.mes <= currentMonth ? sp.mes : currentMonth;
  const type = sp.tipo === "income" || sp.tipo === "expense" ? sp.tipo : undefined;
  const category =
    sp.categoria === "none" ? "none" : Number(sp.categoria) > 0 ? Number(sp.categoria) : undefined;
  const q = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim() : undefined;

  const categories = getCategories(workspace.id);
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const txs = getTransactions(workspace.id, { month, type, category, q });
  const totals = txs.reduce(
    (acc, t) => (t.type === "income" ? { ...acc, income: acc.income + t.amountCents } : { ...acc, expense: acc.expense + t.amountCents }),
    { income: 0, expense: 0 },
  );
  const fmt = (c: number) => formatMoney(c, workspace.currency);
  const base = `/e/${workspace.id}/movimientos`;

  return (
    <div className="flex flex-col gap-6">
      <AddTransactionForm workspaceId={workspace.id} categories={categories} defaultDate={now} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthPicker month={month} current={currentMonth} basePath={base} />
        <form className="flex flex-wrap gap-2" action={base}>
          <input type="hidden" name="mes" value={month} />
          <Input name="q" placeholder="Buscar…" defaultValue={q} className="w-40" />
          <Select name="tipo" defaultValue={type ?? ""}>
            <option value="">Todos</option>
            <option value="income">Ingresos</option>
            <option value="expense">Gastos</option>
          </Select>
          <Select name="categoria" defaultValue={category === undefined ? "" : String(category)}>
            <option value="">Todas las categorías</option>
            <option value="none">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type === "income" ? "ingreso" : "gasto"})
              </option>
            ))}
          </Select>
          <button className={buttonClass.secondary}>Filtrar</button>
        </form>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full  text-sm">
          <thead className="border-b border-line bg-surface-2 text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="hidden px-3 py-2 sm:px-4 font-normal sm:table-cell">Fecha</th>
              <th className="px-3 py-2 sm:px-4 font-normal">Descripción</th>
              <th className="px-3 py-2 sm:px-4 font-normal">Categoría</th>
              <th className="px-3 py-2 sm:px-4 text-right font-normal">Monto</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {txs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No hay movimientos con estos filtros.
                </td>
              </tr>
            )}
            {txs.map((t) => (
              <tr key={t.id} className="border-b border-line transition last:border-0 hover:bg-surface-2/60">
                <td className="hidden whitespace-nowrap px-3 py-2 sm:px-4 text-muted sm:table-cell">{shortDate(t.date)}</td>
                <td className="px-3 py-2 sm:px-4">
                  <div className="flex items-center gap-3">
                    <CategoryIcon name={t.categoryId ? names.get(t.categoryId) : null} type={t.type} size="sm" />
                    <div>
                      <div>{t.description}</div>
                      <div className="text-xs text-muted">
                        <span className="sm:hidden">{shortDate(t.date)} · </span>
                        {SOURCE[t.source]}
                        {t.createdBy ? ` · ${t.createdBy}` : ""}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 sm:px-4">
                  <CategorySelect
                    workspaceId={workspace.id}
                    transactionId={t.id}
                    value={t.categoryId}
                    options={categories.filter((c) => c.type === t.type)}
                  />
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-2 sm:px-4 text-right font-semibold tabular-nums ${
                    t.type === "income" ? "text-income" : "text-expense"
                  }`}
                >
                  {t.type === "income" ? "+" : "−"}
                  {fmt(t.amountCents)}
                </td>
                <td className="px-2 py-2 text-right">
                  <DeleteTransaction workspaceId={workspace.id} transactionId={t.id} />
                </td>
              </tr>
            ))}
          </tbody>
          {txs.length > 0 && (
            <tfoot className="border-t border-line text-sm">
              <tr>
                <td colSpan={3} className="px-3 py-2 sm:px-4 text-muted">
                  {txs.length} movimientos · ingresos {fmt(totals.income)} · gastos {fmt(totals.expense)}
                </td>
                <td className="px-3 py-2 sm:px-4 text-right font-medium tabular-nums">
                  {fmt(totals.income - totals.expense)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}

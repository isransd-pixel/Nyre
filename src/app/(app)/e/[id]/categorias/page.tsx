import {
  addCategoryAction,
  addRuleAction,
  deleteCategoryAction,
  deleteRuleAction,
} from "@/app/actions";
import { CategoryIcon } from "@/components/category-icon";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Tags, Wand2 } from "lucide-react";
import { Card, CardTitle, Input, Label, Select } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { BucketSelect } from "./bucket-select";
import { getCategories, getRules } from "@/lib/queries";

export default async function CategoriesPage({ params }: PageProps<"/e/[id]/categorias">) {
  const { id } = await params;
  const { workspace } = await requireWorkspace(Number(id));
  const categories = getCategories(workspace.id);
  const rules = getRules(workspace.id);
  const isFamily = workspace.kind === "family";
  const groups = [
    { type: "expense" as const, title: "Gastos" },
    { type: "income" as const, title: "Ingresos" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="flex flex-col gap-5">
        <CardTitle icon={Tags} hint="Son los “cajones” donde va cada peso. Así el resumen te dice en qué se fue el dinero.">
          Categorías
        </CardTitle>
        {groups.map((g) => {
          const list = categories.filter((c) => c.type === g.type);
          // En familia, los gastos se muestran en lista para poder clasificarlos (50/30/20).
          if (isFamily && g.type === "expense") {
            return (
              <div key={g.type}>
                <h3 className="mb-1 text-sm text-muted">{g.title}</h3>
                <p className="mb-2 text-xs text-muted">
                  Elige si cada una es necesidad, gusto o ahorro: así el resumen arma la regla 50/30/20.
                </p>
                <ul className="flex flex-col divide-y divide-line">
                  {list.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 py-1.5 text-sm">
                      <CategoryIcon name={c.name} type={c.type} size="sm" />
                      <span className="flex-1">{c.name}</span>
                      <BucketSelect workspaceId={workspace.id} categoryId={c.id} value={c.bucket} name={c.name} />
                      <form action={deleteCategoryAction.bind(null, workspace.id, c.id)}>
                        <SubmitButton
                          variant="danger"
                          pendingText="…"
                          confirm={`¿Eliminar "${c.name}"? Sus movimientos quedarán sin categoría.`}
                        >
                          <span aria-label={`Eliminar ${c.name}`}>✕</span>
                        </SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          return (
            <div key={g.type}>
              <h3 className="mb-2 text-sm text-muted">{g.title}</h3>
              <ul className="flex flex-wrap gap-2">
                {list.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 rounded-full border border-line py-0.5 pl-1 pr-1 text-sm">
                    <CategoryIcon name={c.name} type={c.type} size="sm" />
                    {c.name}
                    <form action={deleteCategoryAction.bind(null, workspace.id, c.id)}>
                      <SubmitButton
                        variant="danger"
                        pendingText="…"
                        confirm={`¿Eliminar "${c.name}"? Sus movimientos quedarán sin categoría.`}
                      >
                        <span aria-label={`Eliminar ${c.name}`}>✕</span>
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <ActionForm action={addCategoryAction.bind(null, workspace.id)} className="flex flex-wrap items-end gap-2">
          <Label className="flex-1">
            Nueva categoría
            <Input name="name" placeholder="Ej. Mascotas" required />
          </Label>
          <Select name="type" defaultValue="expense" aria-label="Tipo">
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </Select>
          {isFamily && (
            <Select name="bucket" defaultValue="" aria-label="Clasificación">
              <option value="">Sin clasificar</option>
              <option value="need">Necesidad</option>
              <option value="want">Gusto</option>
              <option value="save">Ahorro y deudas</option>
            </Select>
          )}
          <SubmitButton>Agregar</SubmitButton>
        </ActionForm>
      </Card>

      <Card className="flex flex-col gap-5">
        <CardTitle
          icon={Wand2}
          hint="Al importar, si la descripción contiene el texto, se asigna la categoría. Se usa la primera regla que coincida, así que pon las más específicas primero."
        >
          Reglas automáticas
        </CardTitle>
        {rules.length > 0 && (
          <ul className="flex flex-col divide-y divide-line text-sm">
            {rules.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  “{r.pattern}” → <strong>{r.categoryName}</strong>
                </span>
                <form action={deleteRuleAction.bind(null, workspace.id, r.id)}>
                  <SubmitButton variant="danger" pendingText="…">
                    Quitar
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={addRuleAction.bind(null, workspace.id)} className="flex flex-wrap items-end gap-2">
          <Label className="flex-1">
            Si la descripción contiene
            <Input name="pattern" placeholder="Ej. walmart" required />
          </Label>
          <Label className="flex-1">
            Categoría
            <Select name="categoryId" required defaultValue="">
              <option value="" disabled>
                Elige…
              </option>
              {groups.map((g) => (
                <optgroup key={g.type} label={g.title}>
                  {categories
                    .filter((c) => c.type === g.type)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </Label>
          <label className="flex basis-full items-center gap-2 text-sm">
            <input type="checkbox" name="apply" defaultChecked /> Aplicar también a los movimientos sin
            categoría
          </label>
          <SubmitButton>Crear regla</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}

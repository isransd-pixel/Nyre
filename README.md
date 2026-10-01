# Nyre

Finanzas de la familia y del SaaS en un solo lugar.

- **Espacios separados**: uno para la familia y otro para el negocio (puedes crear más), cada uno con su moneda, categorías y miembros.
- **Movimientos**: captura manual, importación de estados de cuenta en CSV (con detección de duplicados y reglas de categorización) y sincronización con Stripe.
- **Resumen mensual**: ingresos, gastos, balance, tasa de ahorro / margen, gráfica de 12 meses y gastos por categoría.
- **Métricas SaaS** (con Stripe): MRR, ARR, clientes activos, ARPU, churn de 30 días, MRR nuevo y perdido, LTV y MRR histórico.
- **Familia**: invita a otras personas con un enlace; cada quien tiene su cuenta y solo ve los espacios a los que pertenece.

## Empezar

Requiere Node.js 20.9 o superior.

```bash
npm install
cp .env.example .env.local   # y pon un SESSION_SECRET (openssl rand -base64 48)
npm run dev
```

Abre http://localhost:3200 y crea tu cuenta. Se crean automáticamente los espacios **Familia** y **Mi SaaS**.

Los datos se guardan en SQLite en `data/nyre.db` (cambia la ruta con `DATABASE_PATH`). Las migraciones se aplican solas al arrancar. **Respalda ese archivo**: es toda tu información.

## Importar CSV del banco

1. Descarga el estado de cuenta en CSV desde tu banco.
2. En el espacio, ve a **Importar CSV** y elige el archivo.
3. Revisa qué columna es la fecha, la descripción y el monto (o cargos y abonos). Nyre intenta adivinarlo.
4. Importa. Puedes volver a subir el mismo archivo: los movimientos repetidos se omiten.

En **Categorías** puedes crear reglas como “si la descripción contiene *walmart* → Supermercado”, que se aplican al importar.

## Conectar Stripe

En Stripe crea una **llave restringida** con permiso de lectura para *Subscriptions* y *Balance*, y pégala en la pestaña **Stripe** del espacio de negocio. La llave se guarda cifrada con `SESSION_SECRET` (si cambias el secreto tendrás que volver a conectarla).

- Los cobros se registran como ingresos; las comisiones y los reembolsos, como gastos.
- Los depósitos de Stripe a tu banco (payouts) se ignoran. Si también importas el CSV de la cuenta bancaria del negocio, borra esos depósitos para no contarlos dos veces.
- El MRR histórico se reconstruye con el precio actual de cada suscripción y no considera descuentos.

## Desarrollo

```bash
npm test            # pruebas unitarias (vitest)
npm run lint
npm run typecheck
npm run build
npm run db:generate # tras cambiar src/db/schema.ts, genera la migración
```

Estructura:

- `src/db/` — esquema (Drizzle) y conexión a SQLite.
- `src/lib/` — lógica: CSV, montos, métricas, Stripe, sesión.
- `src/app/actions.ts` — todas las mutaciones (server actions), cada una valida que el usuario sea miembro del espacio.
- `src/app/(auth)/` — inicio de sesión, registro e invitaciones.
- `src/app/(app)/` — páginas autenticadas.

## Producción

Cualquier servidor con Node y disco persistente sirve (VPS, Railway o Fly.io con un volumen). Plataformas sin disco persistente, como Vercel, no funcionan con SQLite.

```bash
npm run build
SESSION_SECRET=... npm start
```

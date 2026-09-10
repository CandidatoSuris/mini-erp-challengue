# NOTES

> Completá este archivo a medida que avanzás. Es parte de la entrega.

## Bugs encontrados (backend)

<!-- Por cada bug: qué pasaba, por qué pasaba, cómo lo arreglaste. -->

Fallaban 3 test

1. En el archivo CalcularTotalesTests fallaba el test CalcularTotales_ConAlicuotasMixtas_CalculaIvaPorLinea()

Lo que pasaba era que el metodo CalcularTotales tenia un error en la linea 31.

```
var iva = subtotal * 0.21m;
var total = subtotal + iva;
```

Que no aplicaba el Iva en Linea donde se tenia que calcular el Iva por presupuesto.

Se aplica lo siguiente

```
var subtotalLinea = item.Cantidad * item.PrecioUnitario * (1 - item.DescuentoPct / 100m);
var ivaLinea = subtotalLinea * (item.AlicuotaIva / 100m);
subtotal += subtotalLinea;
totalIva += ivaLinea;
```

2. En el archivo FacturacionTests fallaba el test Facturar_DosVeces_LanzaYNoDescuentaDeMas()

Lo que pasaba era que el metodo FacturarAsync le faltaba una condición de que un presupuesto en estado "Facturado" no debe procesarse más de una vez.

Se aplica lo siguiente

```
if (presupuesto.Estado == EstadoPresupuesto.Facturado)
    throw new InvalidOperationException("El presupuesto ya ha sido facturado");
```

3. En el archivo FacturacionTests fallabva el test Facturar_SinStockSuficiente_LanzaYNoDejaStockNegativo()

Lo que pasaba era que el metodo FacturarAsync le faltaba una condición de que un presupuesto no puede continuar si la cantidad pedida supera al Stock del producto.

Se aplica lo siguiente

```
if (item.Cantidad > articulo.StockActual)
    throw new InvalidOperationException($"No hay suficiente Stock, se piden {item.Cantidad} y solo hay en Stock {articulo.StockActual}");v
```

4. Hay un error al crear nuevos presupuesto pero estos se crean en estado "Borrador"; al listar la lista de presupuestos se filtra Estado != Borrador. Por lo que los nuevos presupuestos no van a aparecer.

```
Estado = EstadoPresupuesto.Borrador,

/// ...

.Where(p => p.Estado != EstadoPresupuesto.Borrador)
```

Solución: se agregó `ListarTodosAsync` / `GET /api/presupuestos/todos` (sin filtrar borradores). El front usa un Switch entre ese endpoint y el listado filtrado.

## Decisiones del cliente React

<!--
Estructura del proyecto, librerías que usaste y por qué, y cómo resolvés los
totales en vivo (subtotal, IVA, total) para que coincidan con el backend.
-->

- **Stack:** Vite + React + TypeScript, React Router, `fetch` tipado (sin Redux/MUI). `pnpm` + workspace. `VITE_API_URL=http://localhost:5080`. Arranque conjunto: `pnpm dev` (API + Vite).
- **Estructura:** `api/`, `types/`, `lib/` (totales + acciones), `pages/`, `components/`.
- **Listados:** Switch “Mostrar borradores” (default ON vía `?mostrarTodos=true`) → `GET .../todos`; OFF → `GET .../presupuestos`.
- **Disclaimer en alta:** se informa que nace en **Borrador**. Tras crear, navegación a `/?mostrarTodos=true`.
- **Totales en vivo:** `lib/totales.ts` espeja `CalcularTotales` (descuento antes del IVA, IVA por línea/alícuota). Formato `es-AR` a 2 decimales solo para mostrar. Caso control: ART-001 + ART-004 → 39.500 / 7.822,50 / 47.322,50.
- **Máquina de estados:** Aprobar / Rechazar / Reabrir / Facturar. Botones enabled/disabled según estado (`accionesPara`). Facturar solo desde **Aprobado** (backend + UI). Errores `400 { error }` en `ErrorBanner`.

## Qué hice y qué dejé afuera

<!-- Qué completaste, qué priorizaste y por qué, qué quedó pendiente. -->

**Hecho:** bugs de totales/facturación; listado todos; endpoints de transición; cliente React must-have (grilla, alta, facturar, estados, errores, NOTES).

**Afuera (stretch / P1-P2):** duplicar presupuesto, reporte top N, Vitest de totales, DELETE desde UI, CRUD de clientes/artículos.

## Cómo usé IA

<!--
Para qué partes la usaste, qué le pediste, qué aceptaste y qué descartaste,
y dónde se equivocó o te llevó por mal camino.
-->

Usé el asistente de Cursor para analizar el gap del frontend, proponer stack/arquitectura e implementar scaffold + pantallas. Revisé y ajusté: Switch + query `mostrarTodos`, disclaimer, tabla enabled/disabled, parseo de `{ error }`, y paridad de totales con el backend. Descarté UI libs pesadas y estado global innecesario.

## Qué haría con más tiempo / qué falta para producción

Auth, validaciones más estrictas en API (cantidad/descuento), redondeo monetario explícito línea a línea si se exige, tests front, CI, edición de borradores, listado de facturas, paginación, y stretch (duplicar / reporte).

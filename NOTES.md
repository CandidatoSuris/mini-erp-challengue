# NOTES

> Completá este archivo a medida que avanzás. Es parte de la entrega.

## Bugs encontrados (backend)

<!-- Por cada bug: qué pasaba, por qué pasaba, cómo lo arreglaste. -->

1. **IVA calculado con alícuota fija del 21% sobre el subtotal total** (`PresupuestoService.CalcularTotales`).
   Pasaba que el IVA se calculaba como `subtotal * 0.21`, ignorando la alícuota propia de
   cada artículo (10,5% para algunos). El test `CalcularTotales_ConAlicuotasMixtas_...`
   lo delataba (esperaba 231, daba 252). Lo arreglé calculando el IVA **por línea**
   (`subtotalLinea * alicuotaLinea / 100`), redondeando a 2 decimales por línea, y
   sumando esos IVAs ya redondeados, tal como indica la regla de negocio.

2. **Los presupuestos nuevos nunca aparecían en el listado** (`PresupuestoService`).
   `CrearAsync` creaba todo con `Estado = Borrador`, pero `ListarAsync` filtra
   explícitamente `Estado != Borrador`. Como no existe ningún flujo que pase un
   presupuesto de Borrador a Aprobado, cualquier presupuesto creado quedaba invisible
   para siempre en `GET /api/presupuestos` (se podía ver vía `GET /{id}` igual). Esto
   rompía el flujo 1 del README ("crear y listar"). Lo arreglé creando los presupuestos
   directamente en estado `Aprobado` (no hay endpoint de aprobación en la API, así que
   no tiene sentido dejarlos en borrador).

3. **Facturar dos veces el mismo presupuesto no fallaba** (`FacturacionService.FacturarAsync`).
   No había ningún chequeo de `Estado == Facturado` antes de descontar stock y generar la
   factura, así que facturar el mismo presupuesto dos veces descontaba el stock dos veces y
   generaba dos facturas. Lo arreglé agregando la validación de idempotencia al principio
   del método, antes de tocar stock.

4. **Facturar sin stock suficiente dejaba stock negativo** (`FacturacionService.FacturarAsync`).
   El método restaba `item.Cantidad` del stock sin verificar que hubiera stock suficiente,
   así que el stock podía quedar en negativo. Lo arreglé validando `articulo.StockActual >=
   item.Cantidad` para **todas** las líneas antes de descontar nada (así una línea sin
   stock no deja a mitad de camino las líneas anteriores ya descontadas).

5. **Numeración de presupuestos podía colisionar** (`NumeracionService.ProximoNumeroPresupuestoAsync`).
   El próximo número se calculaba como `COUNT(*) + 1`. Si se borra un presupuesto que no es
   el último creado, el conteo baja pero el número más alto existente no cambia, y el
   próximo número generado puede coincidir con uno que ya existe (p. ej. crear #1,#2,#3,
   borrar #2 → count=2 → el próximo sale #3, que ya existe). Lo arreglé usando
   `MAX(Numero) + 1`, igual que ya se hacía (correctamente) para las facturas.

6. **No se validaban cantidades/descuentos inválidos** (`CrearPresupuestoItemDto`).
   El DTO de request no tenía ninguna validación, así que `POST /api/presupuestos` aceptaba
   `cantidad: 0` o negativa, y descuentos fuera de 0-100. Le agregué `[Range(1, int.MaxValue)]`
   a `Cantidad` y `[Range(0, 100)]` a `DescuentoPct`; como el controller tiene `[ApiController]`,
   esto ya alcanza para que devuelva 400 automáticamente con el mensaje de validación.

Verifiqué los 6 arreglos corriendo `dotnet test` (6/6 verde) y probando a mano con `curl`
los flujos descritos en el README (alícuotas mixtas, numeración tras borrar, datos
inválidos, stock insuficiente, doble facturación) contra el backend levantado con Docker.

## Decisiones del cliente React

<!--
Estructura del proyecto, librerías que usaste y por qué, y cómo resolvés los
totales en vivo (subtotal, IVA, total) para que coincidan con el backend.
-->

**Stack:** React 19 + TypeScript + Vite. Única librería externa: `react-router-dom`
(dos rutas: `/` listado, `/nuevo` alta). Nada de Redux/Zustand/React Query — con dos
páginas y cinco hooks no se justifica; si el proyecto creciera, lo primero que sumaría
es React Query antes que estado global a mano.

**Estructura** (`frontend/src/`), en capas con una sola dirección de dependencia
(`pages → components/hooks → services`, nunca al revés):

```
pages/        PresupuestosListPage, NuevoPresupuestoPage
components/   presentacionales puros, reciben todo por props (nunca importan
              hooks ni services)
hooks/        estado + reglas de negocio del cliente (useClientes,
              useArticuloSearch, usePresupuestos, useCrearPresupuesto,
              useFacturar, usePresupuestoForm)
services/     única capa que sabe que existe fetch/URL base (http.ts +
              un service por recurso)
types/        espejo de MiniErp.Api.Dtos, más ItemBorrador (sólo frontend)
```

Documenté esta arquitectura en UML antes de escribir código (diagrama de
dependencias + secuencia de los dos flujos) para poder revisarla antes de
implementar — ver `docs/backend-uml.md` para el modelo del backend y
`docs/frontend-uml.md` para el del cliente, ya actualizado para reflejar el único
ajuste real respecto de la propuesta (`useCrearPresupuesto` separado de
`usePresupuestos`, explicado ahí mismo).

**Totales en vivo:** `usePresupuestoForm` (`calcularTotales` en
`hooks/usePresupuestoForm.ts`) replica **exactamente** la regla del backend:
`subtotalLinea = cantidad × precio × (1 − descuento/100)`, IVA por línea
(`subtotalLinea × alicuota/100`) redondeado a 2 decimales con la misma estrategia
de redondeo (half-away-from-zero) antes de sumar. Lo verifiqué contra el flujo del
README (ART-001 + ART-004 sin descuento → subtotal 39.500, IVA 7.822,50, total
47.322,50) tanto en el backend como en el preview del formulario — dan igual. El
backend sigue siendo la fuente de verdad: lo que persiste es siempre la respuesta
de `POST /api/presupuestos`, nunca el cálculo del cliente.

**Manejo de errores:** `services/http.ts` centraliza el `fetch`, arma la URL base y
convierte cualquier respuesta no-2xx en un `ApiError` con el mensaje que mandó el
backend (`{ error: "..." }` o el primer mensaje de `ModelState`). Los hooks
atrapan ese error y lo exponen como string; las páginas lo muestran con
`ErrorAlert`. Al facturar, el error se muestra **en la fila** del presupuesto que
falló (sin stock, vencido, ya facturado), no en un alert genérico.

## Qué hice y qué dejé afuera

<!-- Qué completaste, qué priorizaste y por qué, qué quedó pendiente. -->

**Hecho (Parte B, must-have):**
- Grilla de presupuestos con número, fecha, cliente, estado (badge) y total.
- Alta de presupuesto: cliente, búsqueda de artículos con debounce, cantidad y
  descuento por línea, totales en vivo correctos (incluye validación HTML5
  `min`/`max` + validación propia antes de pegarle a la API).
- Facturar desde la grilla, con el mensaje de error del backend mostrado inline
  si no se puede (sin stock, vencido, ya facturado). El botón "Facturar" se
  esconde una vez que el estado es `Facturado`.
- Eliminar presupuesto desde la grilla (con confirmación).

**Dejé afuera (Parte C, stretch) por tiempo:** duplicar presupuesto y el reporte de
top-N artículos facturados. El detalle de qué haría con más tiempo está en la
última sección.

## Tests propios (Parte C)

**Backend — `MiniErp.Api.Tests`** (nuevo proyecto, agregado a la solución): tests
de integración sobre la API real vía `WebApplicationFactory<Program>` — HTTP +
routing + JSON + EF Core/SQLite de punta a punta, en vez de llamar a los services
directamente como hacen los tests unitarios existentes (`MiniErp.Tests`, que no
toqué). Cada clase usa su propio archivo SQLite descartable
(`IntegrationTestFactory`), así que corren aisladas entre sí y no tocan
`minierp.db` de desarrollo. Un test por cada flujo de la sección "Flujos que
deben funcionar" del README: crear y listar, IVA con alícuotas mixtas, numeración
tras borrar (forzando el escenario real de colisión: borro el del medio, no el
último), cantidad inválida, facturar sin stock, facturar dos veces. 12/12 tests
en verde (`dotnet test` sobre toda la solución, corrido en Docker).

**Frontend — Playwright (`frontend/e2e/`):** 3 tests e2e contra la app real
(frontend + backend corriendo juntos), replicando a mano lo mismo que validé
manualmente durante el desarrollo: alta con alícuotas mixtas (los totales en vivo
tienen que coincidir con lo que persiste el backend), facturar sin stock
suficiente (el error del backend se ve en la fila), y facturar un presupuesto
válido (pasa a "Facturado" y el botón desaparece). `playwright.config.ts` levanta
el backend por Docker (borrando el `.db` antes, para partir de datos limpios) y
el frontend con `npm run dev`; cada test crea su propio presupuesto y lo valida
por la primera fila del listado (ordenado por número descendente), así no
depende de cuántos presupuestos haya de corridas anteriores. Correr con
`npm run test:e2e` desde `frontend/`.

> Nota: si la corrida de Playwright se corta de forma abrupta (Ctrl+C duro, kill
> del proceso), el contenedor del backend puede quedar corriendo — `docker compose
> down` desde la raíz del repo lo limpia.

## Cómo usé IA

<!--
Para qué partes la usaste, qué le pediste, qué aceptaste y qué descartaste,
y dónde se equivocó o te llevó por mal camino.
-->

## Qué haría con más tiempo / qué falta para producción


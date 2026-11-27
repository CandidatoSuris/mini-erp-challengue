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

**Hecho (Parte C, stretch):**
- **Duplicar presupuesto** — sin agregar ningún endpoint nuevo. El insight: `POST
  /api/presupuestos` ya toma el precio/alícuota **actuales** del artículo al crear
  (`PresupuestoService.CrearAsync`, no confía en lo que mande el cliente) y asigna
  número y fecha nuevos solo. Entonces "clonar con número nuevo, fecha de hoy y
  precios refrescados" es exactamente lo que ya hace ese endpoint — no hay nada
  que agregar del lado del backend. Del lado del cliente: botón "Duplicar" en la
  grilla → `GET /api/presupuestos/{id}` (para traer cliente + items) +
  `GET /api/articulos` sin filtro (para precios actuales, y que el *preview* de
  totales en el form ya los muestre refrescados, no los viejos) → precarga el
  mismo formulario de alta (`/nuevo?duplicarDe={id}`) → el usuario revisa/edita y
  confirma con "Crear presupuesto", que es el `POST` normal. Nuevo hook
  `useDuplicarPresupuesto` + un método `reemplazarItems` en `usePresupuestoForm`;
  nada más cambió. Cubierto por un test e2e adicional (ahora son 4).

- **Reporte top-N artículos por monto facturado** — sólo backend, que es lo que
  pide el README para este punto (a diferencia de duplicar, que pedía
  "endpoint + UI"). `GET /api/reportes/top-articulos?desde=&hasta=&top=` en un
  controller nuevo (`ReportesController`) + un service nuevo (`ReportesService`).
  "Monto facturado" = subtotal de línea (sin IVA, misma convención que el resto
  de la app) de los `PresupuestoItem` cuyas `Factura` cayeron dentro del rango
  de fechas, agrupado por artículo y ordenado descendente. La agregación la hago
  en memoria después de traer las filas (sin aritmética en la query): SQLite no
  tiene tipo decimal nativo, EF Core lo guarda como texto, y sumar/multiplicar
  decimales dentro del SQL generado es frágil — el volumen de un ERP chico no
  justifica correr ese riesgo. Rechaza con 400 si `hasta < desde` o `top <= 0`.
  Cubierto por 3 tests de integración nuevos (orden descendente, fuera de rango
  de fechas, validación de fechas invertidas) y probado a mano con `curl`.
  El README sólo pide el endpoint para este punto (a diferencia de duplicar,
  que pedía "endpoint + UI"), así que lo que sigue debajo de esta nota es un
  agregado nuestro, no algo que pedía la consigna: sumamos igual una vista
  simple en el cliente para consultarlo (filtro de fechas + top N + tabla de
  resultados), con la misma arquitectura del resto del front.

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
último), cantidad inválida, facturar sin stock, facturar dos veces, y el
reporte de top-N artículos (orden descendente por monto, fuera de rango de
fechas, validación de fechas invertidas). 15/15 tests en verde (`dotnet test`
sobre toda la solución, corrido en Docker).

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

Usé Claude Code (Claude Sonnet 5) para todo el desarrollo, en una sesión continua,
con Docker como entorno de ejecución porque no tenía el SDK de .NET instalado
localmente (sí tenía Node).

- **Bugs del backend:** le pedí que leyera el README, corriera los tests
  existentes (`dotnet test` vía Docker, 3/6 fallando al principio) y los leyera
  junto con el código para encontrar los bugs plantados. Encontró los 6 (2 con
  test que los delataba, 4 explorando el código y los flujos del README) y los
  arregló. Verifiqué cada fix yo mismo: corriendo los tests (6/6 verde) y
  probando a mano con `curl` los 5 flujos de la sección "Flujos que deben
  funcionar" contra el backend real.
- **Arquitectura antes que código:** antes de tocar el frontend le pedí
  explícitamente que armara documentación UML (modelo de clases + ciclo de vida
  del backend, y después capas/dependencias + diagramas de secuencia del
  frontend) para revisar el diseño *antes* de que generara una sola línea de
  React. Eso me dejó objetar la estructura (ver `docs/backend-uml.md` y
  `docs/frontend-uml.md`) sin tener que leer código para entenderla.
- **Corrección de proceso:** la primera vez hizo `git commit` por su cuenta sin
  pedirme autorización. Le corté eso ahí mismo y le pedí que de ahí en más
  siempre hiciera `git add` y me pasara el mensaje de commit, pero que el commit
  en sí lo haga yo — lo respetó el resto de la sesión.
- **Duplicar presupuesto (Parte C):** yo tenía la intuición de que se podía
  hacer sin tocar el backend; se lo planteé como pregunta y me confirmó el
  razonamiento señalando el detalle técnico exacto que lo hace posible
  (`CrearAsync` ya refresca precio/alícuota desde el artículo actual, no confía
  en lo que manda el cliente). Lo implementé con esa base.
- **Dónde frené una sugerencia:** cuando pregunté si valía la pena trackear de
  qué presupuesto viene un duplicado, en vez de implementarlo directo me dio el
  trade-off (columna nueva, sin EF Migrations reales en el proyecto hoy, cambio
  de contrato en la API) y lo dejé para "qué haría con más tiempo" en vez de
  meterlo — no quería inflar el alcance de algo que no pedía el README.
- **Qué revisé/probé yo antes de aceptar cada entrega:** cada feature la probé
  manualmente en el browser (capturas + inspección de red/consola) antes de
  darla por terminada, además de los tests automáticos que fue agregando.

## Qué haría con más tiempo / qué falta para producción

- **Trazabilidad de duplicados:** agregar `PresupuestoOrigenId` (nullable,
  auto-referencia a `Presupuesto`) para saber de qué presupuesto viene un
  duplicado, exponerlo en `CrearPresupuestoRequest`/`PresupuestoDto`, y mostrar
  "Duplicado de #N" en la grilla. No lo hice ahora porque implica volver a
  tocar el contrato de la API por algo que el README no pedía explícitamente;
  dado que el proyecto usa `Database.EnsureCreated()` y no EF Migrations, la
  columna es trivial de agregar en dev (se borra el `.db`) pero no hay un
  camino de migración real para una base ya en producción — lo primero que
  haría si se sigue este camino es migrar a EF Migrations.
- **Reporte top-N artículos facturados** (Parte C, stretch que no llegué a
  hacer): endpoint que agregue por `Factura`/`PresupuestoItem` en un rango de
  fechas, más una vista simple en el cliente.
- **Idempotencia de facturación bajo concurrencia real:** hoy se garantiza sólo
  a nivel de servicio (`FacturacionService` chequea `Estado == Facturado` antes
  de escribir). Con dos requests simultáneos sobre el mismo presupuesto podrían
  colarse ambos antes de que el primero confirme. Para producción: una
  transacción con aislamiento serializable, o un constraint único en
  `Factura.PresupuestoId`.
- **Autenticación/autorización:** no hay ninguna — cualquiera puede pegarle a
  la API. Mínimo viable: JWT + algún esquema de roles (vendedor vs. quien
  factura).
- **Paginación:** `GET /api/presupuestos` y `GET /api/articulos` devuelven todo
  sin paginar. Con un catálogo o historial grande esto no escala.
- **Estados muertos del enum:** `Borrador` y `Rechazado` existen en
  `EstadoPresupuesto` pero ningún endpoint los asigna hoy — quedaron de una
  posible etapa de aprobación manual que nunca se implementó. Si se quiere ese
  flujo de verdad, hacen falta endpoints para aprobar/rechazar.
- **CI:** no hay pipeline corriendo `dotnet test` + `playwright test`
  automáticamente en cada PR — hoy lo corro manualmente en Docker.

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
  Igual sumamos una vista simple en el cliente para consultarlo — no porque lo
  pidiera la consigna sino porque ya teníamos la arquitectura puesta: página
  `/reporte` con filtro de fecha desde/hasta (por defecto: primer día del mes
  actual hasta hoy) y top N, un hook (`useTopArticulos`) que dispara la
  consulta a pedido (no tiene sentido un rango de fechas por defecto para
  auto-fetchear al montar), y una tabla de resultados. Mismo patrón
  hook+service+componente que el resto del front. Cubierto por un 5º test e2e.

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
fechas, validación de fechas invertidas), más los 7 de la revisión de código de
la siguiente sección. **22/22 tests en verde** (`dotnet test` sobre toda la
solución, corrido en Docker).

**Frontend — Playwright (`frontend/e2e/`):** 6 tests e2e contra la app real
(frontend + backend corriendo juntos): alta con alícuotas mixtas (los totales en
vivo tienen que coincidir con lo que persiste el backend), el caso límite de
redondeo de la revisión de código, facturar sin stock suficiente (el error del
backend se ve en la fila), facturar un presupuesto válido (pasa a "Facturado" y
los botones de Facturar/Eliminar desaparecen), duplicar un presupuesto
(precarga el form y crea uno con número nuevo), y el reporte de top artículos
(factura uno propio y verifica que aparezca con el monto correcto).
`playwright.config.ts` levanta el backend por Docker (borrando el `.db` antes,
para partir de datos limpias) y el frontend con `npm run dev`; cada test crea
sus propios datos y los valida de forma acotada (la primera fila del listado,
o una fila filtrada por código de artículo), así no depende de cuántos
presupuestos/facturas haya de corridas anteriores o de otros tests de la misma
corrida. Correr con `npm run test:e2e` desde `frontend/`.

> Nota: si la corrida de Playwright se corta de forma abrupta (Ctrl+C duro, kill
> del proceso), el contenedor del backend puede quedar corriendo — `docker compose
> down` desde la raíz del repo lo limpia.

## Revisión de código (CR) y correcciones

Le pedí a otro agente que hiciera un code review del diff completo. Devolvió 8
hallazgos (3 críticos, 5 altos). Antes de aceptar ninguno los verifiqué contra
el código real — un CR de un agente es una hipótesis, no un hecho — y encontré
que uno de los sub-claims era directamente falso: decía que `items: null` tira
un `NullReferenceException` → 500, pero en los hechos ASP.NET Core ya lo
rechaza con 400 ("Items field is required") gracias a `Nullable` habilitado en
el proyecto. Lo descarté y seguí con el resto.

**Corregidos**, en el orden que priorizamos (impacto/costo):

1. **`DELETE` de un presupuesto facturado destruía la factura.** Reproduje el
   escenario exacto antes de tocar nada: facturé ART-002 x5 (stock 80→75),
   borré el presupuesto → `204` silencioso, la factura desapareció de
   `GET /api/facturas`, y el stock **no** se revirtió (siguió en 75). Era el
   hallazgo más grave de los 8 — corrupción de datos silenciosa, no solo un
   error de validación. Fix: `EliminarAsync` rechaza con 400 si
   `Estado == Facturado`; el botón "Eliminar" del front ahora se esconde igual
   que "Facturar" una vez facturado.
2. **Numeración y facturación eran check-then-act sin red de seguridad en la
   base.** Agregué índices únicos (`Presupuesto.Numero`, `Factura.Numero`,
   `Factura.PresupuestoId`) — no evitan la carrera entre dos requests
   simultáneos, pero convierten una colisión silenciosa en un `409 Conflict`
   detectable en vez de guardar datos duplicados. Cubierto con dos tests que
   insertan directo por `DbContext` (bypaseando el chequeo de aplicación) para
   confirmar que la constraint de la base realmente frena el duplicado.
3. **Validaciones de request incompletas:** `items: []` creaba un presupuesto
   facturable de $0 (`[MinLength(1)]`), un `clienteId` inexistente tiraba un
   `DbUpdateException` sin atrapar → 500 con stack trace completo filtrado al
   cliente (ahora se valida explícito en `CrearAsync`, igual que ya se hacía
   con el artículo), y `validezDias: 0` o negativo creaba un presupuesto que
   nacía vencido (`[Range(1, int.MaxValue)]` + el mismo chequeo agregado en el
   form del cliente).
4. **`POST /api/presupuestos` devolvía `200 OK`** en vez de `201 Created` con
   header `Location`. Cambiado a `CreatedAtAction`.
5. **El redondeo del IVA en vivo del cliente no coincidía siempre con el
   backend.** Antes de arreglarlo reproduje el caso exacto que reportó el CR
   (ART-004, 31% de descuento → el front daba $326,02, el backend $326,03) y
   después armé un fuzz test de 200.000 casos aleatorios contra una referencia
   exacta en enteros (`BigInt`, sin floats) para confirmar que la nueva función
   de redondeo no tiene otros casos rotos, no solo el que ya conocíamos.
   `Number.EPSILON` fijo no alcanza para montos grandes (el ULP a esa escala es
   órdenes de magnitud mayor); la solución fue redondear primero a una
   precisión bien por encima de 2 decimales para absorber el ruido de punto
   flotante, y recién ahí aplicar el redondeo final.
6. **Manejo de errores centralizado:** agregué un `app.UseExceptionHandler`
   global (con `ILogger`) como red de seguridad para cualquier excepción no
   atrapada explícitamente en un controller — nunca más un stack trace crudo
   al cliente.

**No corregidos, documentados como deuda consciente:**

- **Regla `SubtotalLinea` duplicada** entre `PresupuestoService.CalcularTotales`
  y `PresupuestosController.MapToDto`. Es un riesgo real de divergencia a
  futuro, pero hoy ambas copias son idénticas — no hay bug, hay deuda.
  Refactor pendiente: moverla a un único lugar (función estática pura o al
  dominio) y dejar de instanciar `AppDbContext` solo para testear una función
  que no toca la base.
- **Arquitectura inconsistente entre controllers** (`Presupuestos` usa un
  service, `Articulos`/`Clientes`/`Facturas` inyectan `AppDbContext` directo) y
  las consultas N+1 en `CrearAsync`/`FacturarAsync`. Esto ya estaba así en el
  código que nos dieron al empezar el challenge — no es algo que introdujimos
  nosotros, y el propio CR concede que "para el alcance está bien". No lo
  toqué para no meter un refactor grande de bajo valor inmediato.
- **Concurrencia real sigue sin ser 100% a prueba de balas:** los índices
  únicos convierten la colisión en un error visible, pero la solución
  "correcta" para producción (transacción serializable o un lock pesimista)
  sigue pendiente — queda en la sección de abajo.

## Cómo usé IA

<!--
Para qué partes la usaste, qué le pediste, qué aceptaste y qué descartaste,
y dónde se equivocó o te llevó por mal camino.
-->

Usé Claude Code (Claude Sonnet 5) para todo el desarrollo, en una sesión continua,
con Docker como entorno de ejecución porque no tenía el SDK de .NET instalado
localmente (sí tenía Node). En un punto también usé un **segundo agente
independiente** para un code review del diff completo.

### Para qué partes la usé

Para todo: diagnóstico y arreglo de los 6 bugs plantados del backend,
documentación de arquitectura (UML) antes de escribir código, todo el cliente
React (estructura, componentes, hooks, services), los tres puntos de la Parte C
(duplicar, reporte, tests propios), y un code review independiente del diff ya
terminado (con un segundo agente, verificado por la sesión principal antes de
aplicar nada).

### Qué le pedí

- Que leyera el README y corriera los tests existentes (`dotnet test` vía
  Docker, 3/6 fallando al principio) antes de tocar una línea de código.
- Que, antes de escribir el cliente React, armara documentación UML (modelo de
  clases + ciclo de vida del backend ya arreglado, y después capas/dependencias
  + diagramas de secuencia de la arquitectura propuesta del frontend) para que
  yo la revisara *antes* de que generara una sola línea de React.
- Que implementara "Duplicar presupuesto" (Parte C) validando primero mi
  intuición de que no hacía falta tocar el backend, en vez de asumir que sí.
- Que, ante los 8 hallazgos de un code review hecho por un segundo agente, no
  aplicara ninguno a ciegas: primero verificar cada uno contra el código real
  (con `curl`, tests, o reproduciendo el bug a mano) y recién después arreglar
  los que fueran ciertos.
- Que pidiera autorización explícita antes de cualquier `git commit`.

### Qué acepté y qué descarté

**Acepté**, siempre después de verificarlo yo mismo (tests + `curl` + probar en
el browser), nunca "porque lo dijo la IA":
- Los 6 fixes de bugs del backend originales.
- La arquitectura de capas propuesta en los UML, con un solo ajuste mío
  (separar `useCrearPresupuesto` de `usePresupuestos` para no refetchear la
  grilla desde la página de alta).
- Los 7 fixes de la revisión de código externa (ver esa sección más arriba),
  cada uno reproducido antes de aceptarlo como bug real.

**Descarté:**
- Trackear de qué presupuesto viene un duplicado (columna `PresupuestoOrigenId`)
  cuando me trajo el trade-off (cambio de contrato de API, sin EF Migrations
  reales hoy) — no quería inflar el alcance de algo que el README no pedía, así
  que lo mandé a "qué haría con más tiempo" en vez de implementarlo.
- Uno de los 8 hallazgos del segundo agente (el del code review), que resultó
  ser falso: decía que `items: null` tiraba un `NullReferenceException` → 500,
  pero en los hechos ASP.NET Core ya lo rechazaba con 400 gracias a `Nullable`
  habilitado en el proyecto. Lo descarté después de reproducirlo yo mismo con
  `curl` y confirmar que el comportamiento real no coincidía con el reporte.

### Dónde se equivocó (o yo tuve que corregir el rumbo)

- La primera vez que le pedí fixes del backend, hizo `git commit` por su
  cuenta sin pedirme autorización. Se lo corregí ahí mismo y pedí que de ahí
  en más siempre hiciera `git add` + me pasara el mensaje, pero que el commit
  en sí lo haga yo — lo respetó el resto de la sesión.
- El segundo agente (el del code review) se equivocó en uno de sus 8
  hallazgos (el de `items: null` → 500, arriba). No lo descubrí porque "sonaba
  raro": lo descubrí porque pedí explícitamente que cada hallazgo se verificara
  contra el código real antes de tocar nada, y esa verificación lo sacó a la
  luz. Si hubiera aplicado los 8 hallazgos directo, no habría pasado nada malo
  en este caso puntual (el fix "innecesario" no habría roto nada), pero es el
  tipo de cosa que en otro contexto sí podría introducir un bug donde no había
  ninguno.

## Qué haría con más tiempo / qué falta para producción

- **Notas de crédito/débito para dar de baja una factura.** Ahora mismo una
  factura es inmutable por diseño (no se puede eliminar, ver "Revisión de
  código" más arriba) — correcto para no perder el rastro contable, pero
  también significa que hoy **no hay ninguna forma** de revertir una
  facturación hecha por error o una devolución del cliente: la factura queda
  viva para siempre y el stock ya descontado nunca se repone. Agregaría:
  - `NotaCredito` (asociada a una `Factura`, numeración propia secuencial):
    anula total o parcialmente los montos facturados y **repone** el stock de
    los artículos devueltos — es la operación inversa de `FacturarAsync`
    (`articulo.StockActual += cantidad` en vez de `-=`), con las mismas
    validaciones espejadas (no se puede emitir una nota de crédito por más
    cantidad de la que tiene la factura original, ni dos veces por el mismo
    ítem).
  - `NotaDebito`: agrega cargos adicionales a una factura ya emitida sin tener
    que armar un presupuesto/factura nueva desde cero.
  - Ninguna de las dos "borra" ni modifica la factura original — quedan como
    documentos nuevos que la ajustan, que es como se hace en facturación real
    (y resuelve de raíz el problema que motivó prohibir el `DELETE`: ahora
    habría una forma *correcta* de dar de baja algo facturado, en vez de
    ninguna).
- **Trazabilidad de duplicados:** agregar `PresupuestoOrigenId` (nullable,
  auto-referencia a `Presupuesto`) para saber de qué presupuesto viene un
  duplicado, exponerlo en `CrearPresupuestoRequest`/`PresupuestoDto`, y mostrar
  "Duplicado de #N" en la grilla. No lo hice ahora porque implica volver a
  tocar el contrato de la API por algo que el README no pedía explícitamente;
  dado que el proyecto usa `Database.EnsureCreated()` y no EF Migrations, la
  columna es trivial de agregar en dev (se borra el `.db`) pero no hay un
  camino de migración real para una base ya en producción — lo primero que
  haría si se sigue este camino es migrar a EF Migrations.
- **Idempotencia de facturación bajo concurrencia real:** `FacturacionService`
  sigue chequeando `Estado == Facturado` como check-then-act (sin transacción
  serializable ni lock), así que dos requests simultáneos todavía podrían
  pasar ambos la validación antes de que el primero confirme. Lo que sí agregué
  (ver "Revisión de código") es un índice único en `Factura.PresupuestoId` como
  red de seguridad: si la carrera ocurre, la segunda escritura falla con 409 en
  vez de crear una factura duplicada silenciosa. Para producción real, lo
  siguiente sería una transacción con aislamiento serializable (o un lock
  pesimista sobre la fila del presupuesto).
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

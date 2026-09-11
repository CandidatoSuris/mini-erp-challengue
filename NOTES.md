# NOTES

## Bugs encontrados (backend)

### 1. IVA calculado con alicuota fija de 21% en vez de por linea
**Que pasaba:** `PresupuestoService.CalcularTotales` sumaba todos los subtotales de linea y recien al final le aplicaba un 21% fijo sobre el subtotal total (`subtotal * 0.21m`).
**Por que estaba mal:** ignoraba que cada articulo tiene su propia alicuota (21% o 10.5%), y no respetaba la regla de "IVA por linea, redondeado a 2 decimales, y recien despues sumado". Rompia el caso de ejemplo del enunciado y el test `CalcularTotales_ConAlicuotasMixtas_CalculaIvaPorLinea`.
**Como lo resolvi:** movi el calculo de IVA dentro del loop de lineas, usando `item.AlicuotaIva` de cada una y redondeando con `Math.Round(..., 2, MidpointRounding.AwayFromZero)` antes de sumar.
**Commit:** `fix: calcular IVA por linea segun alicuota de cada articulo`

### 2. Facturar no validaba stock disponible
**Que pasaba:** `FacturacionService.FacturarAsync` restaba `articulo.StockActual -= item.Cantidad` sin chequear si alcanzaba, pudiendo dejar el stock negativo.
**Por que estaba mal:** rompia la regla "el stock no puede quedar negativo" y el test `Facturar_SinStockSuficiente_LanzaYNoDejaStockNegativo`.
**Como lo resolvi:** separe el proceso en dos pasadas: primero valido que haya stock suficiente en todas las lineas (sin modificar nada), y recien si todas pasan, aplico los descuentos. Asi si una linea falla, ninguna llega a modificarse.
**Commit:** `fix: validar stock disponible antes de facturar`

### 3. Facturacion sin control de duplicados
**Que pasaba:** `FacturarAsync` nunca chequeaba si el presupuesto ya estaba en estado `Facturado` antes de proceder. Se podia facturar el mismo presupuesto multiples veces, descontando stock de mas cada vez.
**Por que estaba mal:** rompia la regla "un presupuesto se puede facturar una sola vez" y el test `Facturar_DosVeces_LanzaYNoDescuentaDeMas`.
**Como lo resolvi:** agregue el chequeo `if (presupuesto.Estado == EstadoPresupuesto.Facturado) throw ...` al principio del metodo, junto al chequeo de vencimiento.
**Commit:** `fix: impedir facturar dos veces el mismo presupuesto`

### 4. Presupuestos recien creados no aparecian en la lista
**Que pasaba:** `PresupuestoService.ListarAsync` filtraba con `.Where(p => p.Estado != EstadoPresupuesto.Borrador)`, pero todo presupuesto nuevo nace en `Borrador` (`CrearAsync`) y no existe ningun flujo en el codigo que lo cambie de estado antes de facturar.
**Por que estaba mal:** ningun presupuesto recien creado aparecia nunca en `GET /api/presupuestos` — justo el primer flujo de prueba del enunciado ("Crear y listar"). Sin test asociado; lo detecte levantando la API y probando el flujo con `curl` (ver mas abajo, "Como use IA").
**Como lo resolvi:** saque el filtro de `ListarAsync`.
**Verificacion manual:** `GET /api/presupuestos` daba `[]` antes de crear; con el fix, el presupuesto creado aparece. De paso confirme tambien el fix del IVA con el caso del enunciado: subtotal 39500, iva 7822.50, total 47322.50 — coincide exacto.
**Commit:** `fix: listar presupuestos recien creados`

### 5. Numeracion de presupuestos por `Count()` podia colisionar al borrar
**Que pasaba:** `NumeracionService.ProximoNumeroPresupuestoAsync` calculaba el numero como `Count() + 1`, a diferencia de `ProximoNumeroFacturaAsync` que ya usaba correctamente `MaxAsync(Numero) + 1`.
**Por que estaba mal:** si se borraba un presupuesto que no era el ultimo (ej: se crean 3, se borra el del medio), el conteo bajaba y un presupuesto nuevo podia recibir un numero que **ya tenia otra fila existente** — colision real entre dos filas activas al mismo tiempo. Sin test asociado; lo detecte siguiendo el flujo manual "numeracion tras borrar" del enunciado.
**Como lo resolvi:** cambie a `MaxAsync(p => (int?)p.Numero) ?? 0`, mismo patron que ya usaba `Facturas`.
**Limitacion conocida (documentada, no resuelta):** este fix evita la colision entre filas que coexisten, pero no evita que se reutilice el numero de un presupuesto ya borrado si ese era el de mayor numeracion (ej: creo A=1, B=2, borro B, creo C -> C tambien recibe el numero 2). Probandolo manualmente confirme este comportamiento. La solucion completa requeriria un contador persistente e independiente de las filas existentes (una tabla/columna que solo se incremente, nunca dependa de que sigue existiendo en la base) — lo dejo para "que haria con mas tiempo" mas abajo, ya que el fix aplicado resuelve el caso mas grave (colision entre documentos que coexisten) dentro del alcance de tiempo del challenge.
**Commit:** `fix: numeracion de presupuestos evita colision entre filas existentes`

### 6. Sin validacion de cantidad o descuento invalidos
**Que pasaba:** `CrearAsync` no validaba `Cantidad` ni `DescuentoPct` de cada linea antes de guardar el presupuesto.
**Por que estaba mal:** se aceptaban cantidades cero o negativas y descuentos fuera de 0-100, rompiendo la regla explicita del enunciado y el flujo de prueba "Datos invalidos". Sin test asociado originalmente (le agregue uno propio, ver Parte C).
**Como lo resolvi:** agregue las validaciones al principio del loop en `CrearAsync`, usando el mismo mecanismo de excepciones (`InvalidOperationException`) que ya usa el resto del servicio, capturado por el controller como `400 BadRequest`.
**Verificacion manual:** cantidad 0 y -5 rechazadas con 400, descuento 150 rechazado con 400, caso valido (cantidad 2, descuento 10%) aceptado con totales correctos.
**Commit:** `fix: validar cantidad y descuento en alta de presupuesto`

---

## Decisiones del cliente React

**Estructura:**
```
frontend/src/
  types.ts            -> interfaces TS que reflejan los DTOs del backend (Dtos.cs)
  api/client.ts        -> wrappers de fetch para los 8 endpoints
  utils/totales.ts      -> replica la regla de negocio del calculo de totales
  components/
    PresupuestosGrid.tsx
    PresupuestoForm.tsx
  App.tsx              -> orquesta todo con useState (sin router)
```

**Librerias:** Vite + React + TypeScript. Para el alcance de este challenge (una pantalla de grilla + un formulario) `useState`/`useEffect` y CSS a mano alcanzan y evitan tiempo de configuracion que no aporta valor demostrable. `fetch` nativo en vez de axios, por la misma razon (8 endpoints simples, sin necesidad de interceptores ni configuracion compleja).

**Como calculo los totales en vivo:** `utils/totales.ts` replica exactamente la misma formula que el backend (una vez arreglado el bug #1): por linea, `cantidad * precioUnitario * (1 - descuentoPct/100)`, IVA de esa linea segun su propia alicuota redondeado a 2 decimales (`Math.round` con correccion de `Number.EPSILON` para evitar errores de punto flotante), y recien despues se suman subtotal e IVA de todas las lineas. Lo verifique manualmente contra la API real con el caso de ejemplo del enunciado (ART-001 21% + ART-004 10.5%) y dio exacto: subtotal 39500, IVA 7822.50, total 47322.50 — coincide con lo que devuelve el backend. El backend sigue siendo la fuente de verdad; este calculo es solo una ayuda visual antes de confirmar.

**Manejo de errores de facturacion:** el mensaje que muestra la UI es el mismo `error` que devuelve el backend en el body del 400 (sin stock, vencido, ya facturado), mostrado inline en la fila correspondiente de la grilla — no un mensaje generico.

---

## Que hice y que deje afuera

**Hecho:**
- Parte A completa: los 6 bugs encontrados, arreglados y verificados (3 via `dotnet test`, 3 via pruebas manuales contra la API real corriendo).
- Parte B completa (must-have): grilla de presupuestos, alta con busqueda de articulos y totales en vivo correctos, facturacion desde la grilla con manejo de error especifico por tipo de falla.
- Parte C: agregue 3 tests propios en el backend cubriendo los bugs #5 y #6, que no tenian test asociado originalmente.

**Dejado afuera (Parte C):**
- **Duplicar presupuesto:** Requeriria un endpoint nuevo (`POST /api/presupuestos/{id}/duplicar`) que copie los items pero refresque `PrecioUnitario`/`AlicuotaIva` desde el articulo actual (no desde el snapshot del original), mas un boton en la grilla.
- **Reporte top N articulos facturados:**  Se resolveria con una consulta agrupando `FacturaItems` (o recorriendo `Presupuestos.Items` de las facturas) por articulo, filtrando por rango de fechas de la factura, ordenando por monto descendente y tomando los primeros N.
- **Caso "presupuesto vencido"** no lo pude probar end-to-end desde el frontend, porque el alta siempre crea con fecha de hoy — se prueba manualmente en Swagger manipulando la fecha en la base o esperando a que venza. La logica del backend ya lo valida (`FacturacionService.FacturarAsync` chequea vencimiento), solo no arme una forma de disparar el caso desde la UI.
- **Loading states / validaciones adicionales de UI:** el front tiene un loading basico al cargar y errores por presupuesto en la grilla, pero no hay validacion de formulario mas alla de lo que ya rechaza el backend (ej: no deshabilito el boton "Crear" si falta seleccionar cliente, se lo notifica recien al enviar).

**Como priorice:** primero garantizar que los 6 bugs quedaran resueltos y verificados (no solo "el test pasa", sino tambien confirmado contra la API real corriendo), despues los must-have del cliente (que son evaluados explicitamente como obligatorios), y solo despues sumar algo de Parte C dado que quedaba tiempo — priorice tests sobre features nuevas porque reforzaban justamente los bugs que yo mismo encontre sin ayuda de un test existente.

---

## Como use IA

Use Claude (Claude Code) durante todo el proceso con revision activa en cada paso — no acepté nada sin correrlo.

**Para que la use:**
- **Analisis del backend:** hice el análisis de los errores que fueron reportados, pensé las soluciones y a partir de ahí fui comparando formas de resolver los problmeas.  Despues de cada explicacion, le pedi el detalle de como lo resolveria antes de aplicar ningun cambio.
- **Implementacion de los fixes:** una vez que entendia cada bug y la solucion propuesta, realizaba en conjunto a Claude Code el cambio puntal y corría los tests.
- **Scaffold y codigo del cliente React:** le pedi la estructuración del frontend siguiendo la especificacion del enunciado.
- **Tests propios:** le pedí distintos tipos de test, así se verificaban la mayor cantidad de casos posibles. 

---

## Que haria con mas tiempo / que falta para produccion

- **Numeracion robusta:** reemplazar el `MaxAsync` actual por un contador persistente (tabla/columna que solo se incremente, independiente de que filas sigan existiendo), para eliminar del todo la posibilidad de reutilizar un numero ya usado por un presupuesto borrado.
- **Parte C completa:** duplicar presupuesto (con refresco de precios) y el reporte de top N articulos facturados por rango de fechas.
- **Mas tests:** cobertura de los controllers (actualmente los tests son solo a nivel de servicio), y tests en el frontend (ej: con Vitest + Testing Library para `utils/totales.ts` y el flujo de alta).
- **Validaciones de formulario en el frontend:** deshabilitar el submit si falta cliente o lineas, mensajes de validacion antes de tocar el backend.
- **Manejo de errores de red mas robusto:** si la API no esta corriendo, el mensaje actual es generico; se podria diferenciar "API caida" de "error de negocio".
- **Autenticacion/autorizacion:** el sistema actual no tiene ningun control de acceso — cualquiera que le pegue a la API puede crear, facturar o borrar. Para produccion haria falta como minimo un esquema de usuarios/roles.
- **Migraciones de EF Core:** actualmente la base se crea con `EnsureCreated()` en el seeder, que no genera historial de migraciones. Para produccion usaria `Migrations` reales de EF Core para poder versionar cambios de esquema.
- **Paginacion:** `GET /api/presupuestos` y `GET /api/articulos` devuelven todo sin paginar; con un dataset real esto no escala.

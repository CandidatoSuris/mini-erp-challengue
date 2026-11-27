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

## Qué hice y qué dejé afuera

<!-- Qué completaste, qué priorizaste y por qué, qué quedó pendiente. -->

## Cómo usé IA

<!--
Para qué partes la usaste, qué le pediste, qué aceptaste y qué descartaste,
y dónde se equivocó o te llevó por mal camino.
-->

## Qué haría con más tiempo / qué falta para producción


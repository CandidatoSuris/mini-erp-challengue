using System.ComponentModel.DataAnnotations;

namespace MiniErp.Api.Dtos;

// ---- Requests ----
public record CrearPresupuestoItemDto(
    int ArticuloId,
    [Range(1, int.MaxValue, ErrorMessage = "La cantidad debe ser mayor a cero.")] int Cantidad,
    [Range(0, 100, ErrorMessage = "El descuento debe estar entre 0 y 100.")] decimal DescuentoPct);

public record CrearPresupuestoRequest(int ClienteId, int ValidezDias, List<CrearPresupuestoItemDto> Items);

// ---- Responses ----
public record ArticuloDto(
    int Id,
    string Codigo,
    string Descripcion,
    decimal PrecioUnitario,
    int StockActual,
    decimal AlicuotaIva);

public record PresupuestoItemDto(
    int ArticuloId,
    string ArticuloCodigo,
    string ArticuloDescripcion,
    int Cantidad,
    decimal PrecioUnitario,
    decimal DescuentoPct,
    decimal AlicuotaIva,
    decimal SubtotalLinea);

public record PresupuestoDto(
    int Id,
    int Numero,
    DateTime Fecha,
    int ClienteId,
    string ClienteRazonSocial,
    string Estado,
    int ValidezDias,
    List<PresupuestoItemDto> Items,
    decimal Subtotal,
    decimal Iva,
    decimal Total);

public record FacturaDto(
    int Id,
    int Numero,
    DateTime Fecha,
    int PresupuestoId,
    decimal Subtotal,
    decimal Iva,
    decimal Total);

public record ClienteDto(
    int Id,
    string RazonSocial,
    string Cuit,
    string CondicionIva);

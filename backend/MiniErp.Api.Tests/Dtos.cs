namespace MiniErp.Api.Tests;

// Copias minimas de los DTOs de la API para (de)serializar en los tests de integracion,
// sin acoplar el proyecto de tests a los tipos internos de MiniErp.Api.Dtos.

public record ArticuloDto(int Id, string Codigo, string Descripcion, decimal PrecioUnitario, int StockActual, decimal AlicuotaIva);

public record ItemRequest(int ArticuloId, int Cantidad, decimal DescuentoPct);

public record CrearPresupuestoRequest(int ClienteId, int ValidezDias, List<ItemRequest> Items);

public record PresupuestoDto(
    int Id,
    int Numero,
    DateTime Fecha,
    int ClienteId,
    string ClienteRazonSocial,
    string Estado,
    int ValidezDias,
    List<object> Items,
    decimal Subtotal,
    decimal Iva,
    decimal Total);

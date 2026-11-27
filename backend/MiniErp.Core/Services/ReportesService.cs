using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Data;

namespace MiniErp.Core.Services;

public record TopArticuloResultado(int ArticuloId, string Codigo, string Descripcion, int CantidadFacturada, decimal MontoFacturado);

public class ReportesService
{
    private readonly AppDbContext _db;

    public ReportesService(AppDbContext db) => _db = db;

    /// <summary>
    /// Top N articulos por monto facturado (subtotal de linea, sin IVA, misma
    /// convencion que el resto de la app) dentro de un rango de fechas de
    /// facturacion [desde, hasta], ambos inclusive.
    /// </summary>
    public async Task<List<TopArticuloResultado>> TopArticulosPorMontoFacturadoAsync(DateTime desde, DateTime hasta, int top)
    {
        // Traemos las filas planas (sin aritmetica en la query) y agregamos en memoria:
        // SQLite no tiene tipo decimal nativo y EF Core lo guarda como texto, asi que
        // sumar/multiplicar decimales dentro del SQL generado es fragil. El volumen de
        // facturas de un ERP chico no justifica el riesgo.
        var filas = await (
            from factura in _db.Facturas
            where factura.Fecha >= desde && factura.Fecha <= hasta
            join item in _db.PresupuestoItems on factura.PresupuestoId equals item.PresupuestoId
            join articulo in _db.Articulos on item.ArticuloId equals articulo.Id
            select new
            {
                articulo.Id,
                articulo.Codigo,
                articulo.Descripcion,
                item.Cantidad,
                item.PrecioUnitario,
                item.DescuentoPct,
            }).ToListAsync();

        return filas
            .GroupBy(f => new { f.Id, f.Codigo, f.Descripcion })
            .Select(g => new TopArticuloResultado(
                g.Key.Id,
                g.Key.Codigo,
                g.Key.Descripcion,
                g.Sum(x => x.Cantidad),
                g.Sum(x => x.Cantidad * x.PrecioUnitario * (1 - x.DescuentoPct / 100m))))
            .OrderByDescending(r => r.MontoFacturado)
            .Take(top)
            .ToList();
    }
}

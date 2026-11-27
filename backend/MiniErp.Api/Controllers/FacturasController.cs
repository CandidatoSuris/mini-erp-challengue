using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniErp.Api.Dtos;
using MiniErp.Core.Data;
using MiniErp.Core.Services;

namespace MiniErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FacturasController : ControllerBase
{
    private readonly FacturacionService _facturacion;
    private readonly AppDbContext _db;

    public FacturasController(FacturacionService facturacion, AppDbContext db)
    {
        _facturacion = facturacion;
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<FacturaDto>>> Listar()
    {
        var lista = await _db.Facturas
            .OrderByDescending(f => f.Numero)
            .Select(f => new FacturaDto(f.Id, f.Numero, f.Fecha, f.PresupuestoId, f.Subtotal, f.Iva, f.Total))
            .ToListAsync();

        return Ok(lista);
    }

    // POST /api/facturas/facturar/5
    [HttpPost("facturar/{presupuestoId:int}")]
    public async Task<ActionResult<FacturaDto>> Facturar(int presupuestoId)
    {
        try
        {
            var f = await _facturacion.FacturarAsync(presupuestoId);
            return Ok(new FacturaDto(f.Id, f.Numero, f.Fecha, f.PresupuestoId, f.Subtotal, f.Iva, f.Total));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (DbUpdateException)
        {
            // Dos requests concurrentes pasaron el chequeo de "ya facturado" antes de que
            // el primero confirmara; el indice unico en Factura.PresupuestoId lo frena aca.
            return Conflict(new { error = "El presupuesto ya fue facturado por otra solicitud. Refresca e intenta de nuevo." });
        }
    }
}

using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Dtos;
using MiniErp.Core.Models;
using MiniErp.Core.Services;

namespace MiniErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PresupuestosController : ControllerBase
{
    private readonly PresupuestoService _service;

    public PresupuestosController(PresupuestoService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<List<PresupuestoDto>>> Listar()
    {
        var lista = await _service.ListarAsync();
        return Ok(lista.Select(MapToDto).ToList());
    }

    [HttpGet("todos")]
    public async Task<ActionResult<List<PresupuestoDto>>> ListarTodos()
    {
        var lista = await _service.ListarTodosAsync();
        return Ok(lista.Select(MapToDto).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PresupuestoDto>> Obtener(int id)
    {
        var presupuesto = await _service.ObtenerAsync(id);
        if (presupuesto is null) return NotFound();
        return Ok(MapToDto(presupuesto));
    }

    [HttpPost]
    public async Task<ActionResult<PresupuestoDto>> Crear([FromBody] CrearPresupuestoRequest request)
    {
        var items = request.Items.Select(i => new PresupuestoItem
        {
            ArticuloId = i.ArticuloId,
            Cantidad = i.Cantidad,
            DescuentoPct = i.DescuentoPct
        }).ToList();

        try
        {
            var creado = await _service.CrearAsync(request.ClienteId, request.ValidezDias, items);
            var completo = await _service.ObtenerAsync(creado.Id);
            return Ok(MapToDto(completo!));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        await _service.EliminarAsync(id);
        return NoContent();
    }

    [HttpPost("{id:int}/aprobar")]
    public async Task<ActionResult<PresupuestoDto>> Aprobar(int id)
    {
        try
        {
            var presupuesto = await _service.AprobarAsync(id);
            return Ok(MapToDto(presupuesto));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:int}/rechazar")]
    public async Task<ActionResult<PresupuestoDto>> Rechazar(int id)
    {
        try
        {
            var presupuesto = await _service.RechazarAsync(id);
            return Ok(MapToDto(presupuesto));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:int}/reabrir")]
    public async Task<ActionResult<PresupuestoDto>> Reabrir(int id)
    {
        try
        {
            var presupuesto = await _service.ReabrirAsync(id);
            return Ok(MapToDto(presupuesto));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private PresupuestoDto MapToDto(Presupuesto p)
    {
        var totales = _service.CalcularTotales(p);

        var items = p.Items.Select(i => new PresupuestoItemDto(
            i.ArticuloId,
            i.Articulo?.Codigo ?? "",
            i.Articulo?.Descripcion ?? "",
            i.Cantidad,
            i.PrecioUnitario,
            i.DescuentoPct,
            i.AlicuotaIva,
            i.Cantidad * i.PrecioUnitario * (1 - i.DescuentoPct / 100m)
        )).ToList();

        return new PresupuestoDto(
            p.Id,
            p.Numero,
            p.Fecha,
            p.ClienteId,
            p.Cliente?.RazonSocial ?? "",
            p.Estado.ToString(),
            p.ValidezDias,
            items,
            totales.Subtotal,
            totales.Iva,
            totales.Total
        );
    }
}

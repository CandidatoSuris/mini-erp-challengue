using Microsoft.AspNetCore.Mvc;
using MiniErp.Api.Dtos;
using MiniErp.Core.Services;

namespace MiniErp.Api.Controllers;

[ApiController]
[Route("api/reportes")]
public class ReportesController : ControllerBase
{
    private readonly ReportesService _service;

    public ReportesController(ReportesService service) => _service = service;

    // GET /api/reportes/top-articulos?desde=2026-01-01&hasta=2026-12-31&top=5
    [HttpGet("top-articulos")]
    public async Task<ActionResult<List<TopArticuloDto>>> TopArticulos(
        [FromQuery] DateTime desde,
        [FromQuery] DateTime hasta,
        [FromQuery] int top = 5)
    {
        if (hasta.Date < desde.Date)
            return BadRequest(new { error = "La fecha 'hasta' no puede ser anterior a 'desde'." });

        if (top <= 0)
            return BadRequest(new { error = "'top' tiene que ser mayor a cero." });

        // 'hasta' es inclusive de todo ese dia, no solo su medianoche.
        var hastaFinDelDia = hasta.Date.AddDays(1).AddTicks(-1);

        var resultado = await _service.TopArticulosPorMontoFacturadoAsync(desde.Date, hastaFinDelDia, top);

        return Ok(resultado
            .Select(r => new TopArticuloDto(r.ArticuloId, r.Codigo, r.Descripcion, r.CantidadFacturada, r.MontoFacturado))
            .ToList());
    }
}

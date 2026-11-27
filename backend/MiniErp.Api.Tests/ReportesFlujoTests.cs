using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace MiniErp.Api.Tests;

public class ReportesFlujoTests : IClassFixture<IntegrationTestFactory>
{
    private const int ClienteDistribuidoraId = 1;
    private readonly HttpClient _client;

    public ReportesFlujoTests(IntegrationTestFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<int> ObtenerArticuloIdAsync(string codigo)
    {
        var articulos = await _client.GetFromJsonAsync<List<ArticuloDto>>($"/api/articulos?busqueda={codigo}");
        return articulos!.Single(a => a.Codigo == codigo).Id;
    }

    private async Task FacturarPresupuestoAsync(int articuloId, int cantidad, decimal descuentoPct = 0)
    {
        var crear = await _client.PostAsJsonAsync(
            "/api/presupuestos",
            new CrearPresupuestoRequest(ClienteDistribuidoraId, 15, [new ItemRequest(articuloId, cantidad, descuentoPct)]));
        crear.EnsureSuccessStatusCode();
        var presupuesto = (await crear.Content.ReadFromJsonAsync<PresupuestoDto>())!;

        var facturar = await _client.PostAsync($"/api/facturas/facturar/{presupuesto.Id}", content: null);
        facturar.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task TopArticulos_OrdenaPorMontoFacturadoDescendente()
    {
        var art001 = await ObtenerArticuloIdAsync("ART-001"); // precio 35.000
        var art005 = await ObtenerArticuloIdAsync("ART-005"); // precio 3.200

        // ART-001 x1 = 35.000 facturado; ART-005 x2 = 6.400 facturado.
        await FacturarPresupuestoAsync(art001, cantidad: 1);
        await FacturarPresupuestoAsync(art005, cantidad: 2);

        var hoy = DateTime.UtcNow.Date;
        var response = await _client.GetAsync(
            $"/api/reportes/top-articulos?desde={hoy:yyyy-MM-dd}&hasta={hoy:yyyy-MM-dd}&top=5");

        response.EnsureSuccessStatusCode();
        var top = await response.Content.ReadFromJsonAsync<List<TopArticuloDto>>();

        Assert.True(top!.Count >= 2);
        var primero = top.First(r => r.ArticuloId == art001);
        var segundo = top.First(r => r.ArticuloId == art005);

        Assert.Equal(35000m, primero.MontoFacturado);
        Assert.Equal(6400m, segundo.MontoFacturado);
        Assert.True(top.FindIndex(r => r.ArticuloId == art001) < top.FindIndex(r => r.ArticuloId == art005));
    }

    [Fact]
    public async Task TopArticulos_FueraDeRangoDeFechas_NoLoIncluye()
    {
        var art002 = await ObtenerArticuloIdAsync("ART-002");
        await FacturarPresupuestoAsync(art002, cantidad: 1);

        var ayer = DateTime.UtcNow.Date.AddDays(-2);
        var anteayer = DateTime.UtcNow.Date.AddDays(-1);

        var response = await _client.GetAsync(
            $"/api/reportes/top-articulos?desde={ayer:yyyy-MM-dd}&hasta={anteayer:yyyy-MM-dd}&top=5");

        response.EnsureSuccessStatusCode();
        var top = await response.Content.ReadFromJsonAsync<List<TopArticuloDto>>();

        Assert.DoesNotContain(top!, r => r.ArticuloId == art002);
    }

    [Fact]
    public async Task TopArticulos_HastaAnteriorADesde_DevuelveBadRequest()
    {
        var response = await _client.GetAsync("/api/reportes/top-articulos?desde=2026-02-01&hasta=2026-01-01&top=5");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}

using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace MiniErp.Api.Tests;

/// <summary>
/// Clase separada de PresupuestosFlujosTests (y por lo tanto con su propia
/// IntegrationTestFactory/base limpia) porque estos tests mutan stock: cada Fact usa
/// un articulo distinto para no depender del orden de ejecucion dentro de la clase.
/// </summary>
public class FacturacionFlujoTests : IClassFixture<IntegrationTestFactory>
{
    private const int ClienteDistribuidoraId = 1;
    private readonly HttpClient _client;

    public FacturacionFlujoTests(IntegrationTestFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<ArticuloDto> ObtenerArticuloAsync(string codigo)
    {
        var articulos = await _client.GetFromJsonAsync<List<ArticuloDto>>($"/api/articulos?busqueda={codigo}");
        return articulos!.Single(a => a.Codigo == codigo);
    }

    private async Task<PresupuestoDto> CrearPresupuestoAsync(int articuloId, int cantidad)
    {
        var response = await _client.PostAsJsonAsync(
            "/api/presupuestos",
            new CrearPresupuestoRequest(ClienteDistribuidoraId, 15, [new ItemRequest(articuloId, cantidad, 0)]));

        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<PresupuestoDto>())!;
    }

    [Fact]
    public async Task FacturarSinStockSuficiente_RechazaYNoDejaStockNegativo()
    {
        var art006 = await ObtenerArticuloAsync("ART-006"); // seed: stock 3
        var presupuesto = await CrearPresupuestoAsync(art006.Id, cantidad: art006.StockActual + 1);

        var facturar = await _client.PostAsync($"/api/facturas/facturar/{presupuesto.Id}", content: null);

        Assert.Equal(HttpStatusCode.BadRequest, facturar.StatusCode);

        var articuloActualizado = await ObtenerArticuloAsync("ART-006");
        Assert.True(articuloActualizado.StockActual >= 0);
        Assert.Equal(art006.StockActual, articuloActualizado.StockActual);
    }

    [Fact]
    public async Task FacturarDosVeces_LaSegundaFallaYElStockSeDescuentaUnaSolaVez()
    {
        var art002 = await ObtenerArticuloAsync("ART-002"); // seed: stock 80
        var presupuesto = await CrearPresupuestoAsync(art002.Id, cantidad: 5);

        var primeraFactura = await _client.PostAsync($"/api/facturas/facturar/{presupuesto.Id}", content: null);
        Assert.Equal(HttpStatusCode.OK, primeraFactura.StatusCode);

        var segundaFactura = await _client.PostAsync($"/api/facturas/facturar/{presupuesto.Id}", content: null);
        Assert.Equal(HttpStatusCode.BadRequest, segundaFactura.StatusCode);

        var articuloActualizado = await ObtenerArticuloAsync("ART-002");
        Assert.Equal(art002.StockActual - 5, articuloActualizado.StockActual);
    }
}

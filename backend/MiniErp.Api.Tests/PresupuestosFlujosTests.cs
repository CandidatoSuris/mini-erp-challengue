using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace MiniErp.Api.Tests;

/// <summary>
/// Tests de integracion sobre la API real (HTTP + routing + JSON + EF Core/SQLite),
/// uno por cada flujo descrito en la seccion "Flujos que deben funcionar" del README.
/// Complementan (no reemplazan) los tests unitarios de MiniErp.Tests, que prueban los
/// services directamente sin pasar por HTTP.
/// </summary>
public class PresupuestosFlujosTests : IClassFixture<IntegrationTestFactory>
{
    private const int ClienteDistribuidoraId = 1;
    private readonly HttpClient _client;

    public PresupuestosFlujosTests(IntegrationTestFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<int> ObtenerArticuloIdAsync(string codigo)
    {
        var articulos = await _client.GetFromJsonAsync<List<ArticuloDto>>($"/api/articulos?busqueda={codigo}");
        return articulos!.Single(a => a.Codigo == codigo).Id;
    }

    private async Task<PresupuestoDto> CrearPresupuestoAsync(int articuloId, int cantidad = 1, int validezDias = 15)
    {
        var response = await _client.PostAsJsonAsync(
            "/api/presupuestos",
            new CrearPresupuestoRequest(ClienteDistribuidoraId, validezDias, [new ItemRequest(articuloId, cantidad, 0)]));

        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<PresupuestoDto>())!;
    }

    [Fact]
    public async Task CrearYListar_ElPresupuestoCreadoApareceEnElListado()
    {
        var art001 = await ObtenerArticuloIdAsync("ART-001");

        var creado = await CrearPresupuestoAsync(art001);
        var lista = await _client.GetFromJsonAsync<List<PresupuestoDto>>("/api/presupuestos");

        Assert.Contains(lista!, p => p.Id == creado.Id);
    }

    [Fact]
    public async Task IvaConAlicuotasMixtas_CalculaLosTotalesDelReadme()
    {
        var art001 = await ObtenerArticuloIdAsync("ART-001"); // 21%
        var art004 = await ObtenerArticuloIdAsync("ART-004"); // 10.5%

        var response = await _client.PostAsJsonAsync(
            "/api/presupuestos",
            new CrearPresupuestoRequest(ClienteDistribuidoraId, 15, [new ItemRequest(art001, 1, 0), new ItemRequest(art004, 1, 0)]));

        response.EnsureSuccessStatusCode();
        var presupuesto = await response.Content.ReadFromJsonAsync<PresupuestoDto>();

        // Con los precios del seed: subtotal 39.500, IVA 7.822,50, total 47.322,50.
        Assert.Equal(39500m, presupuesto!.Subtotal);
        Assert.Equal(7822.5m, presupuesto.Iva);
        Assert.Equal(47322.5m, presupuesto.Total);
    }

    [Fact]
    public async Task NumeracionTrasBorrar_NoColisionaConNingunNumeroExistente()
    {
        var art002 = await ObtenerArticuloIdAsync("ART-002");

        await CrearPresupuestoAsync(art002);
        var segundo = await CrearPresupuestoAsync(art002);
        var tercero = await CrearPresupuestoAsync(art002);

        // Borramos uno que no es el ultimo creado: es el escenario donde "COUNT(*)+1" colisiona.
        var borrar = await _client.DeleteAsync($"/api/presupuestos/{segundo.Id}");
        borrar.EnsureSuccessStatusCode();

        var cuarto = await CrearPresupuestoAsync(art002);

        var numeros = (await _client.GetFromJsonAsync<List<PresupuestoDto>>("/api/presupuestos"))!
            .Select(p => p.Numero)
            .ToList();

        Assert.Equal(numeros.Count, numeros.Distinct().Count());
        Assert.True(cuarto.Numero > tercero.Numero);
    }

    [Fact]
    public async Task CantidadInvalida_DevuelveBadRequestYNoCreaElPresupuesto()
    {
        var art001 = await ObtenerArticuloIdAsync("ART-001");
        var antes = await _client.GetFromJsonAsync<List<PresupuestoDto>>("/api/presupuestos");

        var response = await _client.PostAsJsonAsync(
            "/api/presupuestos",
            new CrearPresupuestoRequest(ClienteDistribuidoraId, 15, [new ItemRequest(art001, 0, 0)]));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var despues = await _client.GetFromJsonAsync<List<PresupuestoDto>>("/api/presupuestos");
        Assert.Equal(antes!.Count, despues!.Count);
    }
}

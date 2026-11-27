using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MiniErp.Core.Data;
using MiniErp.Core.Models;
using Xunit;

namespace MiniErp.Api.Tests;

/// <summary>
/// Cubre los hallazgos de una revision de codigo (CR) de otro agente sobre bugs
/// ya corregidos: borrar un presupuesto facturado, validaciones de request
/// incompletas, codigo de estado de creacion, e indices unicos como red de
/// seguridad para condiciones de carrera.
/// </summary>
public class RevisionDeCodigoTests : IClassFixture<IntegrationTestFactory>
{
    private const int ClienteDistribuidoraId = 1;
    private readonly HttpClient _client;
    private readonly IntegrationTestFactory _factory;

    public RevisionDeCodigoTests(IntegrationTestFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<int> ObtenerArticuloIdAsync(string codigo)
    {
        var articulos = await _client.GetFromJsonAsync<List<ArticuloDto>>($"/api/articulos?busqueda={codigo}");
        return articulos!.Single(a => a.Codigo == codigo).Id;
    }

    [Fact]
    public async Task EliminarPresupuestoFacturado_DevuelveBadRequestYNoBorraLaFactura()
    {
        var art001 = await ObtenerArticuloIdAsync("ART-001");

        var crear = await _client.PostAsJsonAsync(
            "/api/presupuestos",
            new CrearPresupuestoRequest(ClienteDistribuidoraId, 15, [new ItemRequest(art001, 1, 0)]));
        crear.EnsureSuccessStatusCode();
        var presupuesto = (await crear.Content.ReadFromJsonAsync<PresupuestoDto>())!;

        var facturar = await _client.PostAsync($"/api/facturas/facturar/{presupuesto.Id}", content: null);
        facturar.EnsureSuccessStatusCode();

        var eliminar = await _client.DeleteAsync($"/api/presupuestos/{presupuesto.Id}");
        Assert.Equal(HttpStatusCode.BadRequest, eliminar.StatusCode);

        var facturas = await _client.GetFromJsonAsync<List<FacturaDto>>("/api/facturas");
        Assert.Contains(facturas!, f => f.PresupuestoId == presupuesto.Id);
    }

    [Fact]
    public async Task CrearConItemsVacios_DevuelveBadRequest()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/presupuestos",
            new CrearPresupuestoRequest(ClienteDistribuidoraId, 15, []));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CrearConClienteInexistente_DevuelveBadRequestSinStackTrace()
    {
        var art001 = await ObtenerArticuloIdAsync("ART-001");

        var response = await _client.PostAsJsonAsync(
            "/api/presupuestos",
            new CrearPresupuestoRequest(999999, 15, [new ItemRequest(art001, 1, 0)]));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Exception", body);
    }

    [Fact]
    public async Task CrearConValidezDiasCero_DevuelveBadRequest()
    {
        var art001 = await ObtenerArticuloIdAsync("ART-001");

        var response = await _client.PostAsJsonAsync(
            "/api/presupuestos",
            new CrearPresupuestoRequest(ClienteDistribuidoraId, 0, [new ItemRequest(art001, 1, 0)]));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CrearPresupuestoValido_Devuelve201ConLocation()
    {
        var art001 = await ObtenerArticuloIdAsync("ART-001");

        var response = await _client.PostAsJsonAsync(
            "/api/presupuestos",
            new CrearPresupuestoRequest(ClienteDistribuidoraId, 15, [new ItemRequest(art001, 1, 0)]));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);
    }

    [Fact]
    public void IndiceUnico_RechazaDosPresupuestosConElMismoNumero()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        db.Presupuestos.Add(new Presupuesto { Numero = 777, Fecha = DateTime.UtcNow, ClienteId = ClienteDistribuidoraId, ValidezDias = 15, Estado = EstadoPresupuesto.Aprobado });
        db.SaveChanges();

        db.Presupuestos.Add(new Presupuesto { Numero = 777, Fecha = DateTime.UtcNow, ClienteId = ClienteDistribuidoraId, ValidezDias = 15, Estado = EstadoPresupuesto.Aprobado });

        Assert.Throws<DbUpdateException>(() => { db.SaveChanges(); });
    }

    [Fact]
    public async Task IndiceUnico_RechazaDosFacturasParaElMismoPresupuesto()
    {
        var art002 = await ObtenerArticuloIdAsync("ART-002");

        var crear = await _client.PostAsJsonAsync(
            "/api/presupuestos",
            new CrearPresupuestoRequest(ClienteDistribuidoraId, 15, [new ItemRequest(art002, 1, 0)]));
        var presupuesto = (await crear.Content.ReadFromJsonAsync<PresupuestoDto>())!;

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        db.Facturas.Add(new Factura { Numero = 9001, Fecha = DateTime.UtcNow, PresupuestoId = presupuesto.Id, Subtotal = 1, Iva = 1, Total = 2 });
        db.SaveChanges();

        db.Facturas.Add(new Factura { Numero = 9002, Fecha = DateTime.UtcNow, PresupuestoId = presupuesto.Id, Subtotal = 1, Iva = 1, Total = 2 });

        Assert.Throws<DbUpdateException>(() => { db.SaveChanges(); });
    }
}

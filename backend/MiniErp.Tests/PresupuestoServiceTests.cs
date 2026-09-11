using MiniErp.Core.Models;
using MiniErp.Core.Services;
using Xunit;

namespace MiniErp.Tests;

// Tests propios, agregados para cubrir bugs que no tenian test asociado.
public class PresupuestoServiceTests
{
    private static (PresupuestoService presupuestos, MiniErp.Core.Data.AppDbContext db) Armar()
    {
        var db = TestDbFactory.Create();
        var numeracion = new NumeracionService(db);
        var presupuestos = new PresupuestoService(db, numeracion);
        return (presupuestos, db);
    }

    private static async Task<Articulo> SeedArticulo(MiniErp.Core.Data.AppDbContext db)
    {
        var art = new Articulo { Codigo = "A1", Descripcion = "Articulo", PrecioUnitario = 100m, StockActual = 50, AlicuotaIva = 21m };
        db.Articulos.Add(art);
        await db.SaveChangesAsync();
        return art;
    }

    private static async Task<Cliente> SeedCliente(MiniErp.Core.Data.AppDbContext db)
    {
        var cliente = new Cliente { RazonSocial = "Cliente Test", Cuit = "20-00000000-0", CondicionIva = CondicionIva.ResponsableInscripto };
        db.Clientes.Add(cliente);
        await db.SaveChangesAsync();
        return cliente;
    }

    [Fact]
    public async Task Numeracion_NoColisiona_TrasBorrarUnPresupuestoQueNoEsElUltimo()
    {
        var (presupuestos, db) = Armar();
        var articulo = await SeedArticulo(db);
        var cliente = await SeedCliente(db);

        var items = () => new List<PresupuestoItem> { new PresupuestoItem { ArticuloId = articulo.Id, Cantidad = 1, DescuentoPct = 0 } };

        var a = await presupuestos.CrearAsync(cliente.Id, 15, items());
        var b = await presupuestos.CrearAsync(cliente.Id, 15, items());
        var c = await presupuestos.CrearAsync(cliente.Id, 15, items());

        // Se borra el del medio (b), no el ultimo.
        await presupuestos.EliminarAsync(b.Id);

        var d = await presupuestos.CrearAsync(cliente.Id, 15, items());

        var numerosExistentes = new[] { a.Numero, c.Numero, d.Numero };
        Assert.Equal(numerosExistentes.Length, numerosExistentes.Distinct().Count());
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public async Task CrearAsync_ConCantidadInvalida_LanzaExcepcion(int cantidadInvalida)
    {
        var (presupuestos, db) = Armar();
        var articulo = await SeedArticulo(db);
        var cliente = await SeedCliente(db);

        var items = new List<PresupuestoItem>
        {
            new PresupuestoItem { ArticuloId = articulo.Id, Cantidad = cantidadInvalida, DescuentoPct = 0 }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => presupuestos.CrearAsync(cliente.Id, 15, items));
    }

    [Fact]
    public async Task CrearAsync_ConDescuentoFueraDeRango_LanzaExcepcion()
    {
        var (presupuestos, db) = Armar();
        var articulo = await SeedArticulo(db);
        var cliente = await SeedCliente(db);

        var items = new List<PresupuestoItem>
        {
            new PresupuestoItem { ArticuloId = articulo.Id, Cantidad = 1, DescuentoPct = 150 }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => presupuestos.CrearAsync(cliente.Id, 15, items));
    }
}

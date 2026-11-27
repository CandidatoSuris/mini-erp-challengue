using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Models;

namespace MiniErp.Core.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Articulo> Articulos => Set<Articulo>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Presupuesto> Presupuestos => Set<Presupuesto>();
    public DbSet<PresupuestoItem> PresupuestoItems => Set<PresupuestoItem>();
    public DbSet<Factura> Facturas => Set<Factura>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Articulo>().Property(a => a.PrecioUnitario).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Articulo>().Property(a => a.AlicuotaIva).HasColumnType("decimal(5,2)");

        modelBuilder.Entity<PresupuestoItem>().Property(i => i.PrecioUnitario).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<PresupuestoItem>().Property(i => i.DescuentoPct).HasColumnType("decimal(5,2)");
        modelBuilder.Entity<PresupuestoItem>().Property(i => i.AlicuotaIva).HasColumnType("decimal(5,2)");

        modelBuilder.Entity<Factura>().Property(f => f.Subtotal).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Factura>().Property(f => f.Iva).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Factura>().Property(f => f.Total).HasColumnType("decimal(18,2)");

        // Red de seguridad a nivel de base de datos: el calculo de "proximo numero" y el
        // chequeo de "ya facturado" son check-then-act en la capa de aplicacion, asi que
        // dos requests concurrentes podrian pasar ambos la validacion. Estos indices unicos
        // no evitan la carrera, pero garantizan que si ocurre, la base la rechaza en vez de
        // guardar numeros duplicados o dos facturas para el mismo presupuesto.
        modelBuilder.Entity<Presupuesto>().HasIndex(p => p.Numero).IsUnique();
        modelBuilder.Entity<Factura>().HasIndex(f => f.Numero).IsUnique();
        modelBuilder.Entity<Factura>().HasIndex(f => f.PresupuestoId).IsUnique();
    }
}

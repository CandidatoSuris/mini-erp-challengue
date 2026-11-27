using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Data;
using MiniErp.Core.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default") ?? "Data Source=minierp.db"));

builder.Services.AddScoped<NumeracionService>();
builder.Services.AddScoped<PresupuestoService>();
builder.Services.AddScoped<FacturacionService>();
builder.Services.AddScoped<ReportesService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

// Crear y seedear la base al arrancar.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    DbSeeder.Seed(db);
}

// Red de seguridad para cualquier excepcion no atrapada explicitamente en un
// controller (ej. un DbUpdateException que no previmos): nunca devolver un stack
// trace al cliente, y loguear el detalle del lado del servidor.
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(error, "Error no manejado en {Path}", context.Request.Path);

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(new { error = "Ocurrio un error inesperado. Intenta de nuevo." });
    });
});

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.MapControllers();

app.Run();

/// <summary>Expuesta para que MiniErp.Api.Tests pueda usar WebApplicationFactory&lt;Program&gt;.</summary>
public partial class Program { }

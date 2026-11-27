import { test, expect, type Page } from "@playwright/test";

/**
 * E2E contra la app real (frontend + backend .NET, ambos levantados por
 * playwright.config.ts con una base SQLite limpia). Cubren los mismos flujos que
 * ya probé manualmente en el browser durante el desarrollo: alta con totales en
 * vivo, facturar sin stock, facturar y que no se pueda refacturar desde la UI.
 *
 * Estrategia de aislamiento: cada test crea su propio presupuesto y lo revisa
 * usando la primera fila del listado (el backend ordena por numero descendente,
 * asi que el ultimo creado siempre queda arriba), sin depender de cuantos
 * presupuestos haya de corridas o tests anteriores.
 */

async function agregarArticulo(page: Page, codigo: string) {
  await page.getByLabel("Buscar artículo").fill(codigo);
  const resultado = page.locator(".search-box__result", { hasText: codigo });
  await resultado.waitFor();
  await resultado.click();
}

test("alta con alicuotas mixtas: los totales en vivo coinciden con la regla del backend", async ({ page }) => {
  await page.goto("/nuevo");

  await page.getByLabel("Cliente").selectOption({ label: "Distribuidora del Sur S.A." });
  await agregarArticulo(page, "ART-001"); // 21%
  await agregarArticulo(page, "ART-004"); // 10.5%

  const totales = page.locator(".totales");
  await expect(totales).toContainText("$39.500,00");
  await expect(totales).toContainText("$7.822,50");
  await expect(totales).toContainText("$47.322,50");

  await page.getByRole("button", { name: "Crear presupuesto" }).click();

  await expect(page).toHaveURL("/");
  const primeraFila = page.locator("table.presupuestos-table tbody tr").first();
  await expect(primeraFila).toContainText("Distribuidora del Sur S.A.");
  await expect(primeraFila).toContainText("$47.322,50");
  await expect(primeraFila.locator(".badge")).toHaveText("Aprobado");
});

test("facturar sin stock suficiente muestra el error del backend en la fila", async ({ page }) => {
  await page.goto("/nuevo");

  await page.getByLabel("Cliente").selectOption({ label: "Kiosco Dona Rosa" });
  await agregarArticulo(page, "ART-006"); // seed: stock 3
  await page.locator(".items-table__input").first().fill("10");

  await page.getByRole("button", { name: "Crear presupuesto" }).click();
  await expect(page).toHaveURL("/");

  const primeraFila = page.locator("table.presupuestos-table tbody tr").first();
  await primeraFila.getByRole("button", { name: "Facturar" }).click();

  await expect(primeraFila.locator(".alert--error")).toHaveText("Stock insuficiente para el articulo ART-006.", {
    useInnerText: true,
  });
});

test("facturar un presupuesto valido lo pasa a Facturado y oculta el boton", async ({ page }) => {
  await page.goto("/nuevo");

  await page.getByLabel("Cliente").selectOption({ label: "Consumidor Final" });
  await agregarArticulo(page, "ART-002");

  await page.getByRole("button", { name: "Crear presupuesto" }).click();
  await expect(page).toHaveURL("/");

  const primeraFila = page.locator("table.presupuestos-table tbody tr").first();
  await primeraFila.getByRole("button", { name: "Facturar" }).click();

  await expect(primeraFila.locator(".badge")).toHaveText("Facturado");
  await expect(primeraFila.getByRole("button", { name: "Facturar" })).toHaveCount(0);
});

test("duplicar un presupuesto precarga el form y crea uno nuevo con numero distinto", async ({ page }) => {
  await page.goto("/nuevo");
  await page.getByLabel("Cliente").selectOption({ label: "Distribuidora del Sur S.A." });
  await agregarArticulo(page, "ART-005");

  await page.getByRole("button", { name: "Crear presupuesto" }).click();
  await expect(page).toHaveURL("/");

  const filaOriginal = page.locator("table.presupuestos-table tbody tr").first();
  const numeroOriginal = await filaOriginal.locator("td").first().innerText();
  const totalOriginal = await filaOriginal.locator("td").nth(4).innerText();

  await filaOriginal.getByRole("link", { name: "Duplicar" }).click();

  await expect(page).toHaveURL(/\/nuevo\?duplicarDe=\d+/);
  await expect(page.getByText(`Duplicando el presupuesto #${numeroOriginal}`)).toBeVisible();
  await expect(page.getByLabel("Cliente")).not.toHaveValue("");
  await expect(page.locator(".items-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".totales")).toContainText(totalOriginal);

  await page.getByRole("button", { name: "Crear presupuesto" }).click();
  await expect(page).toHaveURL("/");

  const filaNueva = page.locator("table.presupuestos-table tbody tr").first();
  const numeroNuevo = await filaNueva.locator("td").first().innerText();

  expect(Number(numeroNuevo)).toBeGreaterThan(Number(numeroOriginal));
  await expect(filaNueva).toContainText("Distribuidora del Sur S.A.");
  await expect(filaNueva.locator("td").nth(4)).toHaveText(totalOriginal);
});

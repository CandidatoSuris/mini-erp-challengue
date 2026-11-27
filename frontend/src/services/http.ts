const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5080";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function extraerMensajeError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === "string") return body.error;
    if (typeof body?.title === "string" && body?.errors) {
      const primerCampo = Object.values(body.errors as Record<string, unknown>)[0];
      if (Array.isArray(primerCampo) && typeof primerCampo[0] === "string") {
        return primerCampo[0];
      }
      return body.title;
    }
    if (typeof body?.title === "string") return body.title;
  } catch {
    // el body no era JSON
  }
  return `Error inesperado (${res.status}).`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(await extraerMensajeError(res), res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

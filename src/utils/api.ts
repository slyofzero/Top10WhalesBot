import { errorHandler } from "./handlers";

export async function apiFetcher<T>(url: string) {
  try {
    const response = await fetch(url);
    const data = (await response.json()) as T;
    return { response: response.status, data };
  } catch (error) {
    errorHandler(error);
    return null;
  }
}

export async function apiPoster<T>(url: string, body: any) {
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T;
  return { response: response.status, data };
}

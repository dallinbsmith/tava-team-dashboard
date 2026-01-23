import { auth0 } from "./auth0";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export const getAccessToken = async (): Promise<string> => {
  const result = await auth0.getAccessToken();
  if (!result?.token) {
    throw new Error("Unauthorized - please log in again");
  }
  return result.token;
};

export const extractErrorMessage = async (
  res: Response,
  fallback: string,
): Promise<string> => {
  try {
    const data = await res.json();
    return data.error || data.message || fallback;
  } catch {
    try {
      const text = await res.text();
      return text || fallback;
    } catch {
      return fallback;
    }
  }
};

interface FetchOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

const authenticatedFetch = async (
  path: string,
  options: FetchOptions,
): Promise<Response> => {
  const token = await getAccessToken();

  const fetchOptions: RequestInit = {
    method: options.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  return fetch(`${BACKEND_URL}${path}`, fetchOptions);
};

export const authPost = (path: string, body?: unknown) =>
  authenticatedFetch(path, { method: "POST", body });

export const authPut = (path: string, body?: unknown) =>
  authenticatedFetch(path, { method: "PUT", body });

export const authDelete = (path: string) =>
  authenticatedFetch(path, { method: "DELETE" });

export const success = <T>(data: T): ActionResult<T> => ({
  success: true,
  data,
});

export const failure = <T>(error: string): ActionResult<T> => ({
  success: false,
  error,
});

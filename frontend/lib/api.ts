import { User, Squad, UpdateUserRequest } from "@/shared/types/user";
import { extractErrorMessage } from "./api-utils";

export {
  getEmployeesGraphQL,
  getEmployeeGraphQL,
  getCurrentUserGraphQL,
  createEmployeeGraphQL,
  updateEmployeeGraphQL,
  deleteEmployeeGraphQL,
} from "./graphql";

const API_BASE_URL = "/api/proxy";

const getImpersonationHeader = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const impersonatedUserId = sessionStorage.getItem("impersonation_user_id");
  return impersonatedUserId
    ? { "X-Impersonate-User-Id": impersonatedUserId }
    : {};
};

export const fetchWithProxy = async (
  path: string,
  options: RequestInit = {},
): Promise<Response> => {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      ...getImpersonationHeader(),
    },
    credentials: "same-origin",
  });
};

export const handleResponse = async <T>(
  response: Response,
  errorMessage: string,
): Promise<T> => {
  if (!response.ok) {
    const error = await extractErrorMessage(response, errorMessage);
    throw new Error(error);
  }
  return response.json();
};

const get = async <T>(path: string): Promise<T> => {
  const res = await fetchWithProxy(path);
  if (!res.ok)
    throw new Error(await extractErrorMessage(res, `GET ${path} failed`));
  return res.json();
};

const mutate = async <T>(
  path: string,
  method: "POST" | "PUT",
  body?: unknown,
): Promise<T> => {
  const res = await fetchWithProxy(path, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok)
    throw new Error(await extractErrorMessage(res, `${method} ${path} failed`));
  return res.json();
};

const del = async (path: string): Promise<void> => {
  const res = await fetchWithProxy(path, { method: "DELETE" });
  if (!res.ok)
    throw new Error(await extractErrorMessage(res, `DELETE ${path} failed`));
};

const postVoid = async (path: string, body?: unknown): Promise<void> => {
  const res = await fetchWithProxy(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok)
    throw new Error(await extractErrorMessage(res, `POST ${path} failed`));
};

export const getCurrentUser = () => get<User>("/me");
export const getEmployees = () => get<User[]>("/employees");
export const getUserById = (id: number) => get<User>(`/users/${id}`);
export const getSupervisors = () => get<User[]>("/supervisors");
export const getAllUsers = () => get<User[]>("/users");
export const updateUser = (userId: number, data: UpdateUserRequest) =>
  mutate<User>(`/users/${userId}`, "PUT", data);
export const uploadAvatar = (userId: number, imageDataUrl: string) =>
  mutate<User>(`/users/${userId}/avatar/base64`, "POST", {
    image: imageDataUrl,
  });
export const deactivateUser = (userId: number) =>
  postVoid(`/users/${userId}/deactivate`);

export const getSquads = () => get<Squad[]>("/squads");
export const createSquad = (name: string) =>
  mutate<Squad>("/squads", "POST", { name });
export const renameSquad = (id: number, name: string) =>
  mutate<Squad>(`/squads/${id}`, "PUT", { name });
export const deleteSquad = (id: number) => del(`/squads/${id}`);
export const getUsersBySquad = (id: number) =>
  get<User[]>(`/squads/${id}/users`);

export const getDepartments = () => get<string[]>("/departments");
export const createDepartment = (name: string) =>
  mutate<{ id: number; name: string }>("/departments", "POST", { name });
export const renameDepartment = (oldName: string, newName: string) =>
  mutate<void>(`/departments/${encodeURIComponent(oldName)}`, "PUT", {
    name: newName,
  });
export const deleteDepartment = (name: string) =>
  del(`/departments/${encodeURIComponent(name)}`);
export const getUsersByDepartment = (name: string) =>
  get<User[]>(`/departments/${encodeURIComponent(name)}/users`);

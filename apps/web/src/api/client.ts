import type {
  ApiResponse,
  Category,
  Collection,
  Product,
  ProductWithImages,
  Project,
} from '@wasser/shared';

const BASE = import.meta.env.VITE_API_BASE ?? '';
const TOKEN = import.meta.env.VITE_ADMIN_TOKEN ?? '';

/** Thrown on a non-ok API envelope so callers can surface { code, message }. */
export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.ok) throw new ApiError(body.error.code, body.error.message);
  return body.data;
}

export const api = {
  listProducts: (query = '') => request<Product[]>(`/api/products${query}`),
  getProduct: (id: string) => request<ProductWithImages>(`/api/products/${id}`),
  listCategories: () => request<Category[]>('/api/categories'),
  listCollections: () => request<Collection[]>('/api/collections'),
  listProjects: () => request<Project[]>('/api/projects'),
};

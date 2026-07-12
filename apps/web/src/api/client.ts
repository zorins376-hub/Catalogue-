import type {
  ApiResponse,
  Category,
  Collection,
  ImageUpdate,
  Product,
  ProductImage,
  ProductInput,
  ProductUpdate,
  ProductWithImages,
  Project,
} from '@wasser/shared';

const BASE = import.meta.env.VITE_API_BASE ?? '';
const TOKEN = import.meta.env.VITE_ADMIN_TOKEN ?? '';

/** Thrown on a non-ok API envelope so callers can surface { code, message }. */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
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

/** Multipart upload — do NOT set Content-Type; the browser adds the boundary. */
async function upload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.ok) throw new ApiError(body.error.code, body.error.message);
  return body.data;
}

/** Absolute /img URL for a stored key, optionally resized for a thumbnail. */
export function imgSrc(r2Key: string, w?: number): string {
  const q = w ? `?w=${w}` : '';
  return `${BASE}/${r2Key}${q}`;
}

export const api = {
  // products
  listProducts: (query = '') => request<Product[]>(`/api/products${query}`),
  getProduct: (id: string) => request<ProductWithImages>(`/api/products/${id}`),
  createProduct: (input: ProductInput) =>
    request<Product>('/api/products', { method: 'POST', body: JSON.stringify(input) }),
  updateProduct: (id: string, input: ProductUpdate) =>
    request<Product>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteProduct: (id: string) =>
    request<{ deleted: boolean }>(`/api/products/${id}`, { method: 'DELETE' }),
  reorderProducts: (ids: string[]) =>
    request<{ reordered: number }>('/api/products/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    }),

  // images
  listImages: (productId: string) =>
    request<ProductImage[]>(`/api/products/${productId}/images`),
  uploadImage: (productId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return upload<ProductImage>(`/api/products/${productId}/images`, form);
  },
  updateImage: (id: string, patch: ImageUpdate) =>
    request<ProductImage>(`/api/images/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteImage: (id: string) =>
    request<{ deleted: boolean }>(`/api/images/${id}`, { method: 'DELETE' }),

  // taxonomy
  listCategories: () => request<Category[]>('/api/categories'),
  listCollections: () => request<Collection[]>('/api/collections'),
  listProjects: () => request<Project[]>('/api/projects'),
};

import type {
  ApiResponse,
  CatalogExport,
  Category,
  Collection,
  ImageUpdate,
  Page,
  PageInput,
  PageUpdate,
  Product,
  ProductImage,
  ProductInput,
  ProductUpdate,
  ProductWithImages,
  Project,
  ProjectInput,
  ProjectUpdate,
} from '@wasser/shared';

export interface MetaResponse {
  formats: { code: string; widthMm: number; heightMm: number }[];
  orientations: string[];
  fonts: { id: string; name: string; category: string }[];
  defaultFont: string;
}

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

/**
 * Fetch the /print page HTML (admin-authorised) and wrap it in a blob URL so it
 * can be opened in a new tab for preview without exposing the token in the URL.
 */
export async function previewBlobUrl(projectId: string): Promise<string> {
  const res = await fetch(`${BASE}/print/${projectId}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new ApiError('preview_failed', `Preview failed (${res.status})`);
  const html = await res.text();
  return URL.createObjectURL(new Blob([html], { type: 'text/html' }));
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

  // projects
  listProjects: () => request<Project[]>('/api/projects'),
  getProject: (id: string) => request<Project>(`/api/projects/${id}`),
  createProject: (input: ProjectInput) =>
    request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(input) }),
  updateProject: (id: string, input: ProjectUpdate) =>
    request<Project>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteProject: (id: string) =>
    request<{ deleted: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),

  // pages
  listPages: (projectId: string) => request<Page[]>(`/api/projects/${projectId}/pages`),
  createPage: (projectId: string, input: PageInput) =>
    request<Page>(`/api/projects/${projectId}/pages`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updatePage: (id: string, input: PageUpdate) =>
    request<Page>(`/api/pages/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deletePage: (id: string) =>
    request<{ deleted: boolean }>(`/api/pages/${id}`, { method: 'DELETE' }),
  reorderPages: (projectId: string, ids: string[]) =>
    request<{ reordered: number }>(`/api/projects/${projectId}/pages/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    }),

  // render / meta
  render: (projectId: string, kind: 'rgb' | 'cmyk' = 'rgb') =>
    request<{ export_id: string; status: string; kind: string }>(
      `/api/projects/${projectId}/render`,
      { method: 'POST', body: JSON.stringify({ kind }) },
    ),
  getExport: (id: string) => request<CatalogExport & { downloadUrl: string | null }>(`/api/exports/${id}`),
  meta: () => request<MetaResponse>('/api/meta'),
};


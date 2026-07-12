import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProductImage } from '@wasser/shared';
import { api, ApiError, imgSrc } from '../api/client';

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

interface Props {
  productId: string;
  /** notified whenever the image set changes (count, primary, order) */
  onChange?: (images: ProductImage[]) => void;
}

/**
 * Drag-and-drop photo manager for a product (ТЗ stage 3).
 * - drop files anywhere on the zone, or pick from the phone camera/gallery
 * - reorder thumbnails by dragging (persists sort_order)
 * - set the primary photo, delete photos
 * Uploads go straight to the Worker → R2; width/height are read server-side.
 */
export function ImageUploader({ productId, onChange }: Props) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const list = await api.listImages(productId);
    setImages(list);
    onChange?.(list);
  }, [productId, onChange]);

  useEffect(() => {
    refresh().catch((e) => setError(errMsg(e)));
  }, [refresh]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const list = Array.from(files);
      const valid: File[] = [];
      for (const f of list) {
        if (!ACCEPT.includes(f.type)) {
          setError(`Пропущен ${f.name}: только JPEG, PNG, WebP`);
          continue;
        }
        if (f.size > MAX_BYTES) {
          setError(`Пропущен ${f.name}: больше 25 МБ`);
          continue;
        }
        valid.push(f);
      }
      if (valid.length === 0) return;
      setBusy(true);
      try {
        // Sequential keeps ordering deterministic and avoids D1 write contention.
        for (const f of valid) await api.uploadImage(productId, f);
        await refresh();
      } catch (e) {
        setError(errMsg(e));
      } finally {
        setBusy(false);
      }
    },
    [productId, refresh],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
  };

  const makePrimary = async (id: string) => {
    setError(null);
    try {
      await api.updateImage(id, { is_primary: true });
      await refresh();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await api.deleteImage(id);
      await refresh();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  // --- thumbnail reorder (persist sort_order for every moved item) ---
  const onThumbDrop = async (targetIndex: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIndex) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(targetIndex, 0, moved);
    setImages(next); // optimistic
    try {
      await Promise.all(
        next.map((img, i) =>
          img.sort_order === i ? null : api.updateImage(img.id, { sort_order: i }),
        ),
      );
      await refresh();
    } catch (e) {
      setError(errMsg(e));
      await refresh();
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#2b7' : '#ccc'}`,
          background: dragOver ? '#eefbf3' : '#fafafa',
          borderRadius: 8,
          padding: 24,
          textAlign: 'center',
          cursor: 'pointer',
          color: '#666',
        }}
      >
        {busy ? 'Загрузка…' : 'Перетащите фото сюда или нажмите, чтобы выбрать'}
        <div style={{ fontSize: 12, marginTop: 4, color: '#999' }}>
          JPEG / PNG / WebP, до 25 МБ
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(',')}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void uploadFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error && <p style={{ color: 'crimson', marginTop: 8 }}>{error}</p>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 12,
          marginTop: 12,
        }}
      >
        {images.map((img, i) => (
          <figure
            key={img.id}
            draggable
            onDragStart={() => (dragIndex.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => void onThumbDrop(i)}
            style={{
              margin: 0,
              border: img.is_primary ? '2px solid #2b7' : '1px solid #e5e5e5',
              borderRadius: 6,
              overflow: 'hidden',
              background: '#fff',
              cursor: 'grab',
            }}
          >
            <img
              src={imgSrc(img.r2_key, 240)}
              alt=""
              style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
            />
            <figcaption style={{ padding: 6, fontSize: 11, color: '#666' }}>
              <div>
                {img.width}×{img.height}
                {img.is_primary && <span style={{ color: '#2b7' }}> ★ главное</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {!img.is_primary && (
                  <button type="button" onClick={() => void makePrimary(img.id)}>
                    Сделать главным
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void remove(img.id)}
                  style={{ color: 'crimson' }}
                >
                  Удалить
                </button>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function errMsg(e: unknown): string {
  return e instanceof ApiError ? `${e.code}: ${e.message}` : String(e);
}

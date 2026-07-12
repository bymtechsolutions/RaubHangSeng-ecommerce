import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Crop, LoaderCircle, RotateCcw, X } from 'lucide-react';
import { Language, ProductMedia, ProductMediaAspectRatio } from '../types';
import { resolveMediaUrl } from '../lib/media';
import { PRODUCT_MEDIA_ASPECT_RATIOS } from '../lib/productMedia';

export interface ProductMediaEditResult {
  dataUrl: string;
  name: string;
  type: 'image/webp';
  size: number;
  aspectRatio: ProductMediaAspectRatio;
}

interface ProductMediaEditorProps {
  language: Language;
  media: ProductMedia;
  initialAspectRatio: ProductMediaAspectRatio;
  onClose: () => void;
  onSave: (result: ProductMediaEditResult) => Promise<void>;
}

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('Unable to read edited image'));
  reader.readAsDataURL(blob);
});

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('Unable to export edited image'));
  }, 'image/webp', quality);
});

export default function ProductMediaEditor({
  language,
  media,
  initialAspectRatio,
  onClose,
  onSave,
}: ProductMediaEditorProps) {
  const isZh = language === 'zh';
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const dragStateRef = useRef<{ pointerId: number; clientX: number; clientY: number; positionX: number; positionY: number } | null>(null);
  const [aspectRatio, setAspectRatio] = useState<ProductMediaAspectRatio>(initialAspectRatio);
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(50);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      sourceImageRef.current = image;
      setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
      setLoadError(false);
    };
    image.onerror = () => setLoadError(true);
    image.src = resolveMediaUrl(media.url);

    return () => {
      image.onload = null;
      image.onerror = null;
      sourceImageRef.current = null;
    };
  }, [media.url]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, onClose]);

  const numericAspectRatio = useMemo(() => {
    const selectedRatio = PRODUCT_MEDIA_ASPECT_RATIOS.find(option => option.value === aspectRatio)?.ratio;
    if (selectedRatio) {
      const [width, height] = selectedRatio.split('/').map(Number);
      return width / height;
    }
    return naturalSize.width > 0 && naturalSize.height > 0 ? naturalSize.width / naturalSize.height : 4 / 3;
  }, [aspectRatio, naturalSize]);

  const resetEditor = () => {
    setAspectRatio(initialAspectRatio);
    setZoom(1);
    setPositionX(50);
    setPositionY(50);
    setSaveError('');
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStateRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      positionX,
      positionY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextX = dragState.positionX - ((event.clientX - dragState.clientX) / bounds.width) * 100;
    const nextY = dragState.positionY - ((event.clientY - dragState.clientY) / bounds.height) * 100;
    setPositionX(Math.round(Math.max(0, Math.min(100, nextX))));
    setPositionY(Math.round(Math.max(0, Math.min(100, nextY))));
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  };

  const renderEditedBlob = async (maxEdge: number, quality: number) => {
    const sourceImage = sourceImageRef.current;
    if (!sourceImage) throw new Error('Source image is not ready');

    const sourceWidth = sourceImage.naturalWidth;
    const sourceHeight = sourceImage.naturalHeight;
    const sourceAspectRatio = sourceWidth / sourceHeight;
    const baseCropWidth = sourceAspectRatio > numericAspectRatio ? sourceHeight * numericAspectRatio : sourceWidth;
    const baseCropHeight = sourceAspectRatio > numericAspectRatio ? sourceHeight : sourceWidth / numericAspectRatio;
    const cropWidth = baseCropWidth / zoom;
    const cropHeight = baseCropHeight / zoom;
    const sourceX = (sourceWidth - cropWidth) * (positionX / 100);
    const sourceY = (sourceHeight - cropHeight) * (positionY / 100);

    let outputWidth: number;
    let outputHeight: number;
    if (numericAspectRatio >= 1) {
      outputWidth = Math.max(1, Math.min(maxEdge, Math.round(cropWidth)));
      outputHeight = Math.max(1, Math.round(outputWidth / numericAspectRatio));
    } else {
      outputHeight = Math.max(1, Math.min(maxEdge, Math.round(cropHeight)));
      outputWidth = Math.max(1, Math.round(outputHeight * numericAspectRatio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image editor is unavailable');

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(sourceImage, sourceX, sourceY, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);
    return canvasToBlob(canvas, quality);
  };

  const handleSave = async () => {
    if (!sourceImageRef.current || loadError) return;
    setIsSaving(true);
    setSaveError('');

    try {
      let editedBlob: Blob | null = null;
      for (const attempt of [
        { maxEdge: 1600, quality: 0.9 },
        { maxEdge: 1400, quality: 0.84 },
        { maxEdge: 1100, quality: 0.78 },
      ]) {
        editedBlob = await renderEditedBlob(attempt.maxEdge, attempt.quality);
        if (editedBlob.size <= 2 * 1024 * 1024) break;
      }

      if (!editedBlob || editedBlob.size > 2 * 1024 * 1024) {
        throw new Error(isZh ? '编辑后的图片仍超过 2MB，请放大裁剪范围后重试。' : 'The edited image is still over 2MB. Use a wider crop and try again.');
      }

      const originalName = (media.name || 'product-media').replace(/\.[^.]+$/, '');
      await onSave({
        dataUrl: await blobToDataUrl(editedBlob),
        name: `${originalName}-edited.webp`,
        type: 'image/webp',
        size: editedBlob.size,
        aspectRatio,
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : (isZh ? '图片编辑失败，请重试。' : 'Unable to edit this image. Please try again.'));
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="product-media-editor-title">
      <button type="button" className="absolute inset-0 cursor-default" onClick={() => !isSaving && onClose()} aria-label={isZh ? '关闭图片编辑器' : 'Close image editor'} />
      <div className="relative z-10 flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-900 px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <h3 id="product-media-editor-title" className="flex items-center gap-2 text-sm font-black text-white sm:text-base">
              <Crop className="h-4 w-4 text-sky-400" />
              <span>{isZh ? '裁剪与调整图片' : 'Crop and adjust image'}</span>
            </h3>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              {isZh ? '原图会保留；保存后会建立一张新的编辑副本。' : 'The original stays untouched. Saving creates a new edited copy.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            aria-label={isZh ? '关闭编辑器' : 'Close editor'}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_320px] lg:overflow-hidden">
          <div className="flex min-h-[320px] items-center justify-center bg-[radial-gradient(circle_at_center,_#334155_0,_#0f172a_68%)] p-4 sm:p-7 lg:min-h-0">
            {loadError ? (
              <div className="max-w-md rounded-xl border border-rose-500/40 bg-rose-950/40 p-5 text-center text-sm leading-6 text-rose-200">
                {isZh ? '无法载入这张图片进行编辑。外部图片可能禁止浏览器裁剪；请先上传图片到媒体库后再编辑。' : 'This image cannot be loaded for editing. External hosts may block browser cropping; upload it to the media library first.'}
              </div>
            ) : naturalSize.width === 0 ? (
              <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                <span>{isZh ? '正在载入图片…' : 'Loading image…'}</span>
              </div>
            ) : (
              <div
                className="relative w-full max-w-2xl touch-none overflow-hidden rounded-lg bg-slate-800 shadow-2xl ring-1 ring-white/15 cursor-grab active:cursor-grabbing"
                style={{ aspectRatio: numericAspectRatio, touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
              >
                <img
                  src={resolveMediaUrl(media.url)}
                  alt={media.name || (isZh ? '正在编辑的产品图片' : 'Product image being edited')}
                  crossOrigin="anonymous"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
                  style={{
                    objectPosition: `${positionX}% ${positionY}%`,
                    transform: `scale(${zoom})`,
                    transformOrigin: `${positionX}% ${positionY}%`,
                  }}
                  draggable={false}
                />
                <div className="pointer-events-none absolute inset-0 border border-white/35" />
                <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-dashed border-white/35" />
                <div className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-dashed border-white/35" />
                <div className="pointer-events-none absolute inset-y-0 left-1/3 border-l border-dashed border-white/35" />
                <div className="pointer-events-none absolute inset-y-0 left-2/3 border-l border-dashed border-white/35" />
                <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/75 px-3 py-1 text-[10px] font-bold text-white shadow-sm">
                  {isZh ? '拖动图片调整位置' : 'Drag image to reposition'}
                </span>
              </div>
            )}
          </div>

          <aside className="overflow-y-auto border-t border-slate-800 bg-slate-900 p-4 sm:p-5 lg:border-l lg:border-t-0">
            <fieldset>
              <legend className="text-xs font-bold text-white">{isZh ? '裁剪比例' : 'Crop ratio'}</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PRODUCT_MEDIA_ASPECT_RATIOS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAspectRatio(option.value)}
                    aria-pressed={aspectRatio === option.value}
                    className={`min-h-10 rounded-lg border px-2.5 py-2 text-[11px] font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                      aspectRatio === option.value
                        ? 'border-sky-400 bg-sky-500/15 text-sky-200'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {isZh ? option.labelZh : option.labelEn}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <span>{isZh ? '缩放' : 'Zoom'}</span>
                  <span className="tabular-nums text-slate-400">{Math.round(zoom * 100)}%</span>
                </span>
                <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={event => setZoom(Number(event.target.value))} className="mt-2 w-full accent-sky-500" />
              </label>
              <label className="block">
                <span className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <span>{isZh ? '水平位置' : 'Horizontal position'}</span>
                  <span className="tabular-nums text-slate-400">{positionX}%</span>
                </span>
                <input type="range" min="0" max="100" step="1" value={positionX} onChange={event => setPositionX(Number(event.target.value))} className="mt-2 w-full accent-sky-500" />
              </label>
              <label className="block">
                <span className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <span>{isZh ? '垂直位置' : 'Vertical position'}</span>
                  <span className="tabular-nums text-slate-400">{positionY}%</span>
                </span>
                <input type="range" min="0" max="100" step="1" value={positionY} onChange={event => setPositionY(Number(event.target.value))} className="mt-2 w-full accent-sky-500" />
              </label>
            </div>

            <button type="button" onClick={resetEditor} disabled={isSaving} className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-300 hover:border-slate-500 hover:text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">
              <RotateCcw className="h-4 w-4" />
              <span>{isZh ? '重置调整' : 'Reset adjustments'}</span>
            </button>

            {saveError && <p role="alert" className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs leading-5 text-rose-200">{saveError}</p>}

            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-800 pt-5">
              <button type="button" onClick={onClose} disabled={isSaving} className="min-h-11 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-300 hover:text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">
                {isZh ? '取消' : 'Cancel'}
              </button>
              <button type="button" onClick={handleSave} disabled={isSaving || loadError || naturalSize.width === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 text-xs font-bold text-white hover:bg-sky-500 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
                {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                <span>{isSaving ? (isZh ? '正在保存…' : 'Saving…') : (isZh ? '保存编辑副本' : 'Save edited copy')}</span>
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

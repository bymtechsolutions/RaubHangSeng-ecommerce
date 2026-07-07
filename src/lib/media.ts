const hasProtocol = /^(data:|blob:|https?:\/\/|\/\/)/i;
const mediaFilename = /^[^/?#]+\.(jpe?g|png|webp|gif|mp4|webm|mov)$/i;

export const resolveMediaUrl = (url?: string) => {
  const value = (url || '').trim();
  if (!value) return '';
  if (hasProtocol.test(value)) return value;
  if (value.startsWith('/')) return encodeURI(value);
  if (value.startsWith('uploads/')) return encodeURI(`/${value}`);
  if (value.startsWith('storefront/')) return encodeURI(`/uploads/${value}`);
  if (mediaFilename.test(value)) return `/uploads/storefront/${encodeURIComponent(value)}`;
  return value;
};

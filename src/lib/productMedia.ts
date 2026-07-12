import { ProductMediaAspectRatio } from '../types';

export const PRODUCT_MEDIA_ASPECT_RATIOS: Array<{
  value: ProductMediaAspectRatio;
  labelZh: string;
  labelEn: string;
  ratio?: string;
}> = [
  { value: 'square', labelZh: '正方形 1:1', labelEn: 'Square 1:1', ratio: '1 / 1' },
  { value: 'portrait', labelZh: '竖版 4:5', labelEn: 'Portrait 4:5', ratio: '4 / 5' },
  { value: 'landscape', labelZh: '横版 4:3', labelEn: 'Landscape 4:3', ratio: '4 / 3' },
  { value: 'wide', labelZh: '宽屏 16:9', labelEn: 'Wide 16:9', ratio: '16 / 9' },
  { value: 'original', labelZh: '原始比例', labelEn: 'Original ratio' },
];

export const getProductMediaAspectRatio = (value?: ProductMediaAspectRatio) => (
  PRODUCT_MEDIA_ASPECT_RATIOS.find(option => option.value === value) ||
  PRODUCT_MEDIA_ASPECT_RATIOS.find(option => option.value === 'landscape')!
);

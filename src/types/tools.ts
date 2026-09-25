import type { ToolType, EraserMode } from './document';

export interface PenSettings {
  color: string;
  size: number;
}

export interface HighlighterSettings {
  color: string;
  size: number;
  opacity: number;
}

export interface EraserSettings {
  mode: EraserMode;
  size: number;
}

export interface ToolState {
  currentTool: ToolType;
  pen: PenSettings;
  highlighter: HighlighterSettings;
  eraser: EraserSettings;
}

export const MEDICAL_PEN_COLORS = [
  { name: 'Ghi chú (Đen)', value: '#1A1A1A' },
  { name: 'Tiêu đề (Xanh Navy)', value: '#1E3A8A' },
  { name: 'Động mạch / Chú ý (Đỏ)', value: '#DC2626' },
  { name: 'Tĩnh mạch (Xanh lam)', value: '#2563EB' },
  { name: 'Thần kinh (Vàng cam)', value: '#D97706' },
  { name: 'Bạch huyết / Mô (Xanh lục)', value: '#059669' },
  { name: 'Cơ / Mô liên kết (Tím)', value: '#7C3AED' },
  { name: 'Xám ghi', value: '#6B7280' },
];

export const MEDICAL_HIGHLIGHTER_COLORS = [
  { name: 'Vàng huỳnh quang', value: '#FACC15', hexBg: 'rgba(250, 204, 21, 0.4)' },
  { name: 'Xanh lục dịu mắt', value: '#4ADE80', hexBg: 'rgba(74, 222, 128, 0.4)' },
  { name: 'Xanh lơ biển', value: '#38BDF8', hexBg: 'rgba(56, 189, 248, 0.4)' },
  { name: 'Hồng phấn', value: '#F472B6', hexBg: 'rgba(244, 114, 182, 0.4)' },
  { name: 'Cam đào', value: '#FB923C', hexBg: 'rgba(251, 146, 60, 0.4)' },
  { name: 'Tím hoa cà', value: '#C084FC', hexBg: 'rgba(192, 132, 252, 0.4)' },
];

export const PEN_SIZE_PRESETS = [1.5, 2.5, 4, 6];
export const HIGHLIGHTER_SIZE_PRESETS = [14, 22, 32];
export const ERASER_SIZE_PRESETS = [10, 24, 40];

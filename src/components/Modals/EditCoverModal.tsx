import React, { useState } from 'react';
import type { Notebook, NotebookCoverStyle } from '../../types/document';
import {
  X,
  Check,
  Palette,
  Sparkles,
  Heart,
  Brain,
  Activity,
  Dna,
  BookOpen,
  Star,
  Shield,
} from 'lucide-react';

interface EditCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  notebook: Notebook | null;
  onSaveCover: (
    notebookId: string,
    coverColor: string,
    coverStyle: NotebookCoverStyle,
    coverIcon?: string,
    coverLabel?: string
  ) => void;
  isDarkMode: boolean;
}

export const COVER_COLORS = [
  { id: 'navy', name: 'Xanh Navy', color: '#1E3A8A' },
  { id: 'burgundy', name: 'Đỏ Burgundy', color: '#831843' },
  { id: 'crimson', name: 'Đỏ Tim Mạch', color: '#991B1B' },
  { id: 'emerald', name: 'Xanh Lục Bảo', color: '#065F46' },
  { id: 'purple', name: 'Tím Thần Kinh', color: '#581C87' },
  { id: 'charcoal', name: 'Xám Than Chì', color: '#1E293B' },
  { id: 'moleskine', name: 'Đen Moleskine', color: '#18181B' },
  { id: 'caramel', name: 'Nâu Da Bò', color: '#92400E' },
  { id: 'coral', name: 'Cam San Hô', color: '#C2410C' },
  { id: 'lilac', name: 'Tím Pastel', color: '#7E22CE' },
  { id: 'sage', name: 'Xanh Xô Thơm', color: '#4D7C0F' },
  { id: 'sky', name: 'Xanh Dương Y Tế', color: '#0284C7' },
];

export const COVER_STYLES: { id: NotebookCoverStyle; label: string; desc: string }[] = [
  { id: 'standard', label: 'Tiêu chuẩn', desc: 'Bìa sổ tay tối giản với gáy sổ & nhãn dán' },
  { id: 'leather', label: 'Bìa da cao cấp', desc: 'Chất liệu da dập nổi sang trọng với viền chỉ' },
  { id: 'gradient', label: 'Gradient rực rỡ', desc: 'Dải màu ánh sáng hiện đại & kính mờ' },
  { id: 'medical', label: 'Biểu trưng Y khoa', desc: 'Họa tiết biểu tượng ngành Y danh giá' },
  { id: 'anatomy', label: 'Giải phẫu học', desc: 'Bản vẽ phác thảo giải phẫu cổ điển' },
  { id: 'minimal', label: 'Tối giản Gold Foil', desc: 'Chữ ép kim vàng trên nền đơn sắc' },
];

export const COVER_ICONS = [
  { id: 'none', label: 'Không có', icon: null },
  { id: 'heart', label: 'Tim mạch', icon: Heart },
  { id: 'brain', label: 'Thần kinh', icon: Brain },
  { id: 'pulse', label: 'Nhịp tim', icon: Activity },
  { id: 'dna', label: 'Di truyền', icon: Dna },
  { id: 'book', label: 'Giáo trình', icon: BookOpen },
  { id: 'star', label: 'Ngôi sao', icon: Star },
  { id: 'shield', label: 'Bảo vệ', icon: Shield },
  { id: 'sparkles', label: 'Lấp lánh', icon: Sparkles },
];

export const EditCoverModal: React.FC<EditCoverModalProps> = ({
  isOpen,
  onClose,
  notebook,
  onSaveCover,
  isDarkMode,
}) => {
  const [selectedColor, setSelectedColor] = useState(
    notebook?.coverColor || COVER_COLORS[0].color
  );
  const [selectedStyle, setSelectedStyle] = useState<NotebookCoverStyle>(
    notebook?.coverStyle || 'standard'
  );
  const [selectedIcon, setSelectedIcon] = useState<string>(
    notebook?.coverIcon || 'none'
  );
  const [coverLabel, setCoverLabel] = useState(
    notebook?.coverLabel || notebook?.title || ''
  );

  if (!isOpen || !notebook) return null;

  const handleSave = () => {
    onSaveCover(
      notebook.id,
      selectedColor,
      selectedStyle,
      selectedIcon === 'none' ? undefined : selectedIcon,
      coverLabel.trim() || notebook.title
    );
    onClose();
  };

  const IconComp = COVER_ICONS.find((i) => i.id === selectedIcon)?.icon;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="h-14 px-6 border-b flex items-center justify-between border-inherit">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-bold">Chỉnh sửa bìa sổ tay (Custom Cover)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: 2 Columns (Left: Live Preview, Right: Controls) */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto max-h-[75vh]">
          {/* Left: Live Cover Preview */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-100/70 dark:bg-zinc-950/60 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Xem trước bìa sổ tay
            </span>

            {/* Notebook Cover Card Simulation */}
            <div
              className="w-44 aspect-[1/1.38] rounded-xl relative shadow-xl overflow-hidden flex flex-col justify-between p-3.5 transition-all select-none border border-white/20"
              style={{
                backgroundColor: selectedColor,
                backgroundImage:
                  selectedStyle === 'gradient'
                    ? `linear-gradient(135deg, ${selectedColor} 0%, #1e1b4b 100%)`
                    : selectedStyle === 'leather'
                    ? `radial-gradient(circle at 50% 30%, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.3) 100%)`
                    : undefined,
              }}
            >
              {/* Left Spine Ribbon Binding Effect */}
              <div className="absolute top-0 left-0 bottom-0 w-3 bg-black/25 border-r border-white/10" />

              {/* Embossed Stitching for Leather */}
              {selectedStyle === 'leather' && (
                <div className="absolute inset-1.5 border border-dashed border-amber-300/40 rounded-lg pointer-events-none" />
              )}

              {/* Watermark anatomy / medical symbol background */}
              {(selectedStyle === 'medical' || selectedStyle === 'anatomy') && (
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                  {selectedStyle === 'medical' ? (
                    <Activity className="w-32 h-32 text-white stroke-[1]" />
                  ) : (
                    <Heart className="w-32 h-32 text-white stroke-[1]" />
                  )}
                </div>
              )}

              {/* Top Accent / Gold Foil Stripe */}
              <div className="flex items-center justify-between pl-3 z-10">
                <span className="text-[9px] font-bold text-white/70 tracking-widest uppercase">
                  MedNotes
                </span>
                {IconComp && (
                  <div className="p-1 rounded-full bg-white/20 text-white backdrop-blur-xs">
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Center Title Badge / Gold Foil Plate */}
              <div className="pl-3 my-auto z-10">
                <div
                  className={`p-2.5 rounded-lg text-center backdrop-blur-md transition-all ${
                    selectedStyle === 'minimal'
                      ? 'bg-amber-100/90 text-amber-950 border border-amber-300/70 shadow-xs'
                      : selectedStyle === 'leather'
                      ? 'bg-amber-950/70 text-amber-200 border border-amber-500/40 shadow-inner'
                      : 'bg-white/85 dark:bg-zinc-900/85 text-slate-900 dark:text-white border border-white/40 shadow-xs'
                  }`}
                >
                  <p className="text-[11px] font-extrabold leading-snug line-clamp-2">
                    {coverLabel || notebook.title}
                  </p>
                  <p className="text-[9px] opacity-75 font-medium mt-0.5">
                    {notebook.pages.length} trang • {notebook.subject || 'Y khoa'}
                  </p>
                </div>
              </div>

              {/* Bottom Spine Detail */}
              <div className="pl-3 flex items-center justify-between text-[8px] text-white/60 font-mono z-10">
                <span>EDITION 2026</span>
                <span>VOL. I</span>
              </div>
            </div>
          </div>

          {/* Right: Customization Controls */}
          <div className="md:col-span-7 space-y-4">
            {/* 1. Cover Label / Title */}
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">
                Tiêu đề in trên bìa
              </label>
              <input
                type="text"
                value={coverLabel}
                onChange={(e) => setCoverLabel(e.target.value)}
                placeholder={notebook.title}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-hidden ${
                  isDarkMode
                    ? 'bg-zinc-800 border-zinc-700 focus:border-blue-500'
                    : 'bg-slate-50 border-slate-200 focus:border-blue-500'
                }`}
              />
            </div>

            {/* 2. Color Palette */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-zinc-500 uppercase tracking-wider">
                Màu sắc bìa ({COVER_COLORS.length} màu)
              </label>
              <div className="grid grid-cols-6 gap-2">
                {COVER_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.color)}
                    className="group relative aspect-square rounded-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-2xs"
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  >
                    {selectedColor === c.color && (
                      <Check className="w-4 h-4 text-white drop-shadow-md stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Cover Style */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-zinc-500 uppercase tracking-wider">
                Phong cách bìa
              </label>
              <div className="grid grid-cols-2 gap-2">
                {COVER_STYLES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStyle(st.id)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      selectedStyle === st.id
                        ? isDarkMode
                          ? 'border-blue-500 bg-blue-950/40 text-blue-200 ring-2 ring-blue-500/20'
                          : 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                        : isDarkMode
                        ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-800/40'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{st.label}</span>
                      {selectedStyle === st.id && (
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
                      {st.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Emblem / Icon on Cover */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-zinc-500 uppercase tracking-wider">
                Biểu tượng dập nổi
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COVER_ICONS.map((ic) => {
                  const Icon = ic.icon;
                  const isSelected = selectedIcon === ic.id;
                  return (
                    <button
                      key={ic.id}
                      type="button"
                      onClick={() => setSelectedIcon(ic.id)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-600 text-white shadow-2xs'
                          : isDarkMode
                          ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                          : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      <span>{ic.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-16 px-6 border-t flex items-center justify-end gap-3 border-inherit bg-slate-50/50 dark:bg-zinc-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Lưu bìa sổ tay</span>
          </button>
        </div>
      </div>
    </div>
  );
};

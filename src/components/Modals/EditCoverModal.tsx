import React, { useState, useRef } from 'react';
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
  Upload,
  Link as LinkIcon,
  RotateCcw,
  Image as ImageIcon,
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
    coverLabel?: string,
    coverImage?: string
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

export const PRESET_COVER_IMAGES = [
  {
    title: 'Atlas Giải Phẫu Cổ Điển',
    url: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Dược Liệu & Thảo Mộc Học',
    url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Phòng Thí Nghiệm & Tế Bào',
    url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Tối Giản Học Thuật Aesthetic',
    url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
  },
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
  const [coverImage, setCoverImage] = useState<string | undefined>(
    notebook?.coverImage
  );
  const [activeTab, setActiveTab] = useState<'style' | 'image'>('style');
  const [imageUrlInput, setImageUrlInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || !notebook) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setCoverImage(imageUrlInput.trim());
    setImageUrlInput('');
  };

  const handleSave = () => {
    onSaveCover(
      notebook.id,
      selectedColor,
      selectedStyle,
      selectedIcon === 'none' ? undefined : selectedIcon,
      coverLabel.trim() || notebook.title,
      coverImage
    );
    onClose();
  };

  const IconComp = COVER_ICONS.find((i) => i.id === selectedIcon)?.icon;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
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

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

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
                  !coverImage && selectedStyle === 'gradient'
                    ? `linear-gradient(135deg, ${selectedColor} 0%, #1e1b4b 100%)`
                    : !coverImage && selectedStyle === 'leather'
                    ? `radial-gradient(circle at 50% 30%, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.3) 100%)`
                    : undefined,
              }}
            >
              {/* Custom Cover Photo if set */}
              {coverImage && (
                <img
                  src={coverImage}
                  alt="Cover"
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />
              )}

              {/* Overlay tint if image exists */}
              {coverImage && (
                <div className="absolute inset-0 bg-black/25 z-0" />
              )}

              {/* Left Spine Ribbon Binding Effect */}
              <div className="absolute top-0 left-0 bottom-0 w-3 bg-black/35 border-r border-white/15 z-10" />

              {/* Embossed Stitching for Leather */}
              {!coverImage && selectedStyle === 'leather' && (
                <div className="absolute inset-1.5 border border-dashed border-amber-300/40 rounded-lg pointer-events-none z-10" />
              )}

              {/* Watermark anatomy / medical symbol background */}
              {!coverImage && (selectedStyle === 'medical' || selectedStyle === 'anatomy') && (
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none z-10">
                  {selectedStyle === 'medical' ? (
                    <Activity className="w-32 h-32 text-white stroke-[1]" />
                  ) : (
                    <Heart className="w-32 h-32 text-white stroke-[1]" />
                  )}
                </div>
              )}

              {/* Top Accent / Gold Foil Stripe */}
              <div className="flex items-center justify-between pl-3 z-10">
                <span className="text-[9px] font-bold text-white/90 tracking-widest uppercase drop-shadow-sm">
                  MedNotes
                </span>
                {IconComp && (
                  <div className="p-1 rounded-full bg-white/30 text-white backdrop-blur-xs shadow-2xs">
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Center Title Badge / Gold Foil Plate */}
              <div className="pl-3 my-auto z-10">
                <div
                  className={`p-2.5 rounded-lg text-center backdrop-blur-md transition-all ${
                    coverImage
                      ? 'bg-black/60 text-white border border-white/30 shadow-lg'
                      : selectedStyle === 'minimal'
                      ? 'bg-amber-100/90 text-amber-950 border border-amber-300/70 shadow-xs'
                      : selectedStyle === 'leather'
                      ? 'bg-amber-950/70 text-amber-200 border border-amber-500/40 shadow-inner'
                      : 'bg-white/85 dark:bg-zinc-900/85 text-slate-900 dark:text-white border border-white/40 shadow-xs'
                  }`}
                >
                  <p className="text-[11px] font-extrabold leading-snug line-clamp-2">
                    {coverLabel || notebook.title}
                  </p>
                  <p className="text-[9px] opacity-80 font-medium mt-0.5">
                    {notebook.pages.length} trang • {notebook.subject || 'Y khoa'}
                  </p>
                </div>
              </div>

              {/* Bottom Spine Detail */}
              <div className="pl-3 flex items-center justify-between text-[8px] text-white/80 font-mono z-10 drop-shadow-sm">
                <span>EDITION 2026</span>
                <span>VOL. I</span>
              </div>
            </div>

            {coverImage && (
              <button
                type="button"
                onClick={() => setCoverImage(undefined)}
                className="mt-3 text-xs text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Gỡ ảnh bìa (Dùng lại màu)</span>
              </button>
            )}
          </div>

          {/* Right: Controls with Tabs */}
          <div className="md:col-span-7 flex flex-col space-y-4">
            {/* Title Label Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                Tiêu đề hiển thị trên bìa sách:
              </label>
              <input
                type="text"
                value={coverLabel}
                onChange={(e) => setCoverLabel(e.target.value)}
                placeholder="VD: Dược thư Quốc gia, Bệnh học nội khoa..."
                className={`w-full px-3 py-2 rounded-xl border text-xs outline-hidden ${
                  isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            {/* Tab switch: [ Màu & Họa tiết ] | [ Tải ảnh / Gắn link ảnh ] */}
            <div className="flex border-b border-inherit gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('style')}
                className={`pb-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
                  activeTab === 'style'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Màu sắc & Họa tiết</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('image')}
                className={`pb-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
                  activeTab === 'image'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Tải ảnh lên / Link ảnh web</span>
              </button>
            </div>

            {/* Tab Content 1: Style & Color */}
            {activeTab === 'style' && (
              <div className="space-y-4">
                {/* Cover Styles */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-2">
                    Phong cách chất liệu bìa:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {COVER_STYLES.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setSelectedStyle(style.id)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          selectedStyle === style.id
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500'
                            : isDarkMode
                            ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-850/50'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>{style.label}</span>
                          {selectedStyle === style.id && (
                            <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
                          {style.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cover Colors */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-2">
                    Màu sắc bìa sách:
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {COVER_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedColor(c.color)}
                        title={c.name}
                        className={`h-9 rounded-xl flex items-center justify-center transition-transform cursor-pointer relative shadow-xs ${
                          selectedColor === c.color ? 'scale-110 ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.color }}
                      >
                        {selectedColor === c.color && (
                          <Check className="w-4 h-4 text-white stroke-[3] drop-shadow-sm" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Emblem Icon */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-2">
                    Biểu tượng dập nổi trên bìa:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COVER_ICONS.map((item) => {
                      const Icon = item.icon;
                      const isSelected = selectedIcon === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedIcon(item.id)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                              : isDarkMode
                              ? 'border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {Icon && <Icon className="w-3.5 h-3.5" />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content 2: Upload or Image URL */}
            {activeTab === 'image' && (
              <div className="space-y-4">
                {/* Upload Button */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    isDarkMode
                      ? 'border-zinc-700 hover:border-blue-500 hover:bg-zinc-800/50'
                      : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/30'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Bấm để tải ảnh bìa từ iPad / Máy tính
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Hỗ trợ ảnh JPG, PNG, WebP (Khuyên dùng ảnh dọc tỷ lệ 1:1.4)
                    </p>
                  </div>
                </div>

                {/* URL Input */}
                <div className="p-3.5 rounded-xl border border-inherit bg-slate-50/50 dark:bg-zinc-850/40 space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
                    <span>Hoặc gắn link hình ảnh trực tiếp từ Web:</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="Dán link ảnh (https://...)"
                      className={`flex-1 px-3 py-1.5 rounded-xl border text-xs outline-hidden ${
                        isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-slate-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleApplyImageUrl}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-2xs"
                    >
                      Dùng ảnh
                    </button>
                  </div>
                </div>

                {/* Preset aesthetic cover suggestions */}
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                    Gợi ý mẫu ảnh bìa học thuật có sẵn:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_COVER_IMAGES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCoverImage(preset.url)}
                        className={`p-2 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                          coverImage === preset.url
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500'
                            : isDarkMode
                            ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-850/50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div
                          className="w-10 h-12 rounded-lg bg-cover bg-center shrink-0 shadow-xs"
                          style={{ backgroundImage: `url(${preset.url})` }}
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                          {preset.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-16 px-6 border-t flex items-center justify-end gap-2.5 border-inherit bg-slate-50/50 dark:bg-zinc-950/50">
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

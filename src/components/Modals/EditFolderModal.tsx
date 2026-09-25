import React, { useState, useRef } from 'react';
import type { Folder } from '../../types/document';
import {
  X,
  Check,
  Folder as FolderIcon,
  Heart,
  Brain,
  Stethoscope,
  Pill,
  Dna,
  Bone,
  BookOpen,
  Star,
  GraduationCap,
  Microscope,
  Activity,
  Palette,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';

interface EditFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: Folder | null;
  onSaveFolder: (
    folderId: string,
    name: string,
    color?: string,
    icon?: string,
    coverImage?: string
  ) => void;
  isDarkMode: boolean;
}

export const FOLDER_COLORS = [
  { id: 'baby_blue', name: 'Xanh GoodNotes', front: '#90CAF9', back: '#64B5F6' },
  { id: 'mint', name: 'Xanh Bạc Hà', front: '#A7F3D0', back: '#6EE7B7' },
  { id: 'coral', name: 'Cam San Hô', front: '#FED7AA', back: '#FDBA74' },
  { id: 'lavender', name: 'Tím Oải Hương', front: '#DDD6FE', back: '#C4B5FD' },
  { id: 'rose', name: 'Hồng Phấn', front: '#FBCFE8', back: '#F9A8D4' },
  { id: 'amber', name: 'Vàng Mật Ong', front: '#FDE68A', back: '#FCD34D' },
  { id: 'emerald', name: 'Xanh Lục Y Tế', front: '#86EFAC', back: '#4ADE80' },
  { id: 'slate', name: 'Xám Tối Giản', front: '#CBD5E1', back: '#94A3B8' },
  { id: 'indigo', name: 'Chàm Hoàng Gia', front: '#C7D2FE', back: '#A5B4FC' },
  { id: 'teal', name: 'Xanh Mòng Két', front: '#99F6E4', back: '#5EEAD4' },
];

export const FOLDER_ICONS = [
  { id: 'folder', label: 'Thư mục', icon: FolderIcon },
  { id: 'heart', label: 'Tim mạch', icon: Heart },
  { id: 'brain', label: 'Thần kinh', icon: Brain },
  { id: 'stethoscope', label: 'Ống nghe', icon: Stethoscope },
  { id: 'pill', label: 'Dược phẩm', icon: Pill },
  { id: 'dna', label: 'Sinh học', icon: Dna },
  { id: 'bone', label: 'Giải phẫu', icon: Bone },
  { id: 'book', label: 'Giáo trình', icon: BookOpen },
  { id: 'star', label: 'Quan trọng', icon: Star },
  { id: 'gradcap', label: 'Khóa học', icon: GraduationCap },
  { id: 'microscope', label: 'Kính hiển vi', icon: Microscope },
  { id: 'pulse', label: 'Lâm sàng', icon: Activity },
];

export const PRESET_FOLDER_COVERS = [
  {
    name: 'Giải Phẫu Học',
    url: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Dược Lý Học',
    url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Sinh Lý Tim Mạch',
    url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Bệnh Lý Vi Sinh',
    url: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=600&q=80',
  },
];

export const EditFolderModal: React.FC<EditFolderModalProps> = ({
  isOpen,
  onClose,
  folder,
  onSaveFolder,
  isDarkMode,
}) => {
  const [folderName, setFolderName] = useState(folder?.name || '');
  const [selectedColor, setSelectedColor] = useState(
    folder?.color || FOLDER_COLORS[0].front
  );
  const [selectedIcon, setSelectedIcon] = useState(
    folder?.icon || 'folder'
  );
  const [coverImage, setCoverImage] = useState<string | undefined>(
    folder?.coverImage
  );
  const [activeTab, setActiveTab] = useState<'style' | 'image'>('style');
  const [imageUrlInput, setImageUrlInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || !folder) return null;

  const colorObj =
    FOLDER_COLORS.find((c) => c.front === selectedColor) || FOLDER_COLORS[0];
  const IconComponent =
    FOLDER_ICONS.find((i) => i.id === selectedIcon)?.icon || FolderIcon;

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
    onSaveFolder(
      folder.id,
      folderName.trim() || folder.name,
      selectedColor,
      selectedIcon,
      coverImage
    );
    onClose();
  };

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
            <h2 className="text-base font-bold">Chỉnh sửa Thư mục (Folder)</h2>
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
          {/* Left: Folder Preview */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-100/70 dark:bg-zinc-950/60 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Xem trước thư mục
            </span>

            {/* Folder Mockup Graphic */}
            <div className="w-40 aspect-[1.25/1] relative flex items-center justify-center transition-transform hover:scale-102">
              <svg viewBox="0 0 100 80" className="w-full h-full drop-shadow-md">
                {/* Back tab */}
                <path
                  d="M 5,20 C 5,12 12,5 20,5 L 42,5 C 47,5 50,10 54,14 L 58,18 L 85,18 C 93,18 97,22 97,30 L 97,70 C 97,76 93,80 85,80 L 15,80 C 7,80 3,76 3,70 Z"
                  fill={colorObj.back}
                />
                {/* Front face */}
                <rect
                  x="3"
                  y="22"
                  width="94"
                  height="56"
                  rx="8"
                  fill={colorObj.front}
                />
              </svg>

              {/* Cover Image inside folder face */}
              {coverImage ? (
                <div className="absolute top-[28%] bottom-[6%] left-[4.5%] right-[4.5%] rounded-lg overflow-hidden border border-white/50 shadow-inner z-10">
                  <img
                    src={coverImage}
                    alt="Folder Cover"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-1.5">
                    <span className="text-[9px] font-bold text-white truncate max-w-full">
                      {folderName || folder.name}
                    </span>
                  </div>
                </div>
              ) : (
                /* Emblem Icon inside folder */
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 rounded-xl bg-white/75 dark:bg-black/40 backdrop-blur-xs text-slate-800 dark:text-white shadow-xs z-10">
                  <IconComponent className="w-6 h-6 stroke-[2]" />
                </div>
              )}

              {/* Item count pill */}
              <span className="absolute bottom-1 font-mono text-[9px] font-bold text-slate-800/80 bg-white/85 px-2 py-0.2 rounded-full shadow-2xs z-20">
                Folder
              </span>
            </div>

            {/* Folder Name Preview */}
            <p className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 truncate max-w-[90%] text-center">
              {folderName || folder.name}
            </p>

            {coverImage && (
              <button
                type="button"
                onClick={() => setCoverImage(undefined)}
                className="mt-2 text-xs text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Gỡ ảnh bìa (Dùng lại màu)</span>
              </button>
            )}
          </div>

          {/* Right: Controls */}
          <div className="md:col-span-7 flex flex-col space-y-4">
            {/* Folder Name Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                Tên thư mục môn học:
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="VD: Tim mạch học, Giải phẫu học..."
                className={`w-full px-3 py-2 rounded-xl border text-xs outline-hidden ${
                  isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            {/* Tab switch: [ Màu & Icon ] | [ Ảnh bìa folder ] */}
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
                <span>Màu Pastel & Biểu tượng</span>
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
                <span>Ảnh bìa (Upload / Link)</span>
              </button>
            </div>

            {/* Tab Content 1: Style & Color */}
            {activeTab === 'style' && (
              <div className="space-y-4">
                {/* Color Palette */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-2">
                    Màu sắc Pastel GoodNotes:
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {FOLDER_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedColor(c.front)}
                        title={c.name}
                        className={`h-9 rounded-xl flex items-center justify-center transition-transform cursor-pointer relative shadow-2xs ${
                          selectedColor === c.front ? 'scale-110 ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.front }}
                      >
                        {selectedColor === c.front && (
                          <Check className="w-4 h-4 text-slate-800 stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icons Grid */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-2">
                    Biểu tượng chuyên khoa Y:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {FOLDER_ICONS.map((item) => {
                      const Icon = item.icon;
                      const isSelected = selectedIcon === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedIcon(item.id)}
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                              : isDarkMode
                              ? 'border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[10px] truncate max-w-full">{item.label}</span>
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
                      Tải ảnh từ iPad / Máy tính làm ảnh thư mục
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Hỗ trợ JPG, PNG, WebP
                    </p>
                  </div>
                </div>

                {/* URL Input */}
                <div className="p-3.5 rounded-xl border border-inherit bg-slate-50/50 dark:bg-zinc-850/40 space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
                    <span>Hoặc gắn link ảnh web (Image URL):</span>
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

                {/* Presets */}
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                    Gợi ý mẫu ảnh thư mục y khoa:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_FOLDER_COVERS.map((preset, idx) => (
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
                          className="w-10 h-10 rounded-lg bg-cover bg-center shrink-0 shadow-xs"
                          style={{ backgroundImage: `url(${preset.url})` }}
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                          {preset.name}
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
            <span>Lưu thư mục</span>
          </button>
        </div>
      </div>
    </div>
  );
};

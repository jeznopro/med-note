import React, { useState } from 'react';
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
} from 'lucide-react';

interface EditFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: Folder | null;
  onSaveFolder: (folderId: string, name: string, color?: string, icon?: string) => void;
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

  if (!isOpen || !folder) return null;

  const colorObj =
    FOLDER_COLORS.find((c) => c.front === selectedColor) || FOLDER_COLORS[0];
  const IconComponent =
    FOLDER_ICONS.find((i) => i.id === selectedIcon)?.icon || FolderIcon;

  const handleSave = () => {
    onSaveFolder(
      folder.id,
      folderName.trim() || folder.name,
      selectedColor,
      selectedIcon
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
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

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Live Preview */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-100/70 dark:bg-zinc-950/60 rounded-xl border border-slate-200 dark:border-zinc-800">
            <div className="w-28 aspect-[1.25/1] relative flex items-center justify-center">
              <svg viewBox="0 0 100 80" className="w-full h-full drop-shadow-md">
                {/* Back Tab */}
                <path
                  d="M 5,20 C 5,12 12,5 20,5 L 42,5 C 47,5 50,10 54,14 L 58,18 L 85,18 C 93,18 97,22 97,30 L 97,70 C 97,76 93,80 85,80 L 15,80 C 7,80 3,76 3,70 Z"
                  fill={colorObj.back}
                />
                {/* Front Face */}
                <rect
                  x="3"
                  y="22"
                  width="94"
                  height="56"
                  rx="8"
                  fill={colorObj.front}
                />
              </svg>
              {/* Folder Center Icon */}
              <div className="absolute inset-0 flex items-center justify-center pt-2">
                <div className="p-2 rounded-xl bg-white/70 dark:bg-zinc-900/60 shadow-xs text-slate-800 dark:text-zinc-100 backdrop-blur-xs">
                  <IconComponent className="w-5 h-5" />
                </div>
              </div>
            </div>
            <span className="text-xs font-bold mt-2 text-slate-800 dark:text-zinc-200 truncate max-w-xs">
              {folderName.trim() || folder.name}
            </span>
          </div>

          {/* 1. Name */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">
              Tên thư mục
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="VD: Giải phẫu học, Sinh lý..."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium outline-hidden ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700 focus:border-blue-500'
                  : 'bg-slate-50 border-slate-200 focus:border-blue-500'
              }`}
            />
          </div>

          {/* 2. Color Palette */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-zinc-500 uppercase tracking-wider">
              Màu sắc thư mục
            </label>
            <div className="grid grid-cols-5 gap-2.5">
              {FOLDER_COLORS.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setSelectedColor(col.front)}
                  className="group aspect-video rounded-xl border border-black/10 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-2xs relative"
                  style={{ backgroundColor: col.front }}
                  title={col.name}
                >
                  {selectedColor === col.front && (
                    <Check className="w-4 h-4 text-slate-800 drop-shadow-md stroke-[3]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Icon Selection */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-zinc-500 uppercase tracking-wider">
              Biểu tượng thư mục
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {FOLDER_ICONS.map((ic) => {
                const Icon = ic.icon;
                const isSelected = selectedIcon === ic.id;
                return (
                  <button
                    key={ic.id}
                    type="button"
                    onClick={() => setSelectedIcon(ic.id)}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                        : isDarkMode
                        ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-800/40 text-zinc-400'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[9px] font-medium truncate max-w-full">
                      {ic.label}
                    </span>
                  </button>
                );
              })}
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
            <span>Lưu thư mục</span>
          </button>
        </div>
      </div>
    </div>
  );
};

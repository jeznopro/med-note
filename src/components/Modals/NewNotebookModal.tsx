import React, { useState } from 'react';
import type { PageTemplate, Folder } from '../../types/document';
import { X, Check, BookOpen } from 'lucide-react';

interface NewNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  currentFolderId: string | null;
  onCreate: (title: string, template: PageTemplate, folderId: string | null, coverColor: string) => void;
  isDarkMode: boolean;
}

export const NOTEBOOK_COVERS = [
  { id: 'blue', name: 'Xanh Y khoa', color: '#1E3A8A', badge: 'Y Khoa' },
  { id: 'red', name: 'Đỏ Tim mạch', color: '#991B1B', badge: 'Giải phẫu' },
  { id: 'green', name: 'Xanh Thảo dược', color: '#065F46', badge: 'Dược lý' },
  { id: 'purple', name: 'Tím Thần kinh', color: '#5B21B6', badge: 'Sinh lý' },
  { id: 'charcoal', name: 'Xám Than chì', color: '#1F2937', badge: 'Lâm sàng' },
  { id: 'amber', name: 'Vàng Cổ điển', color: '#B45309', badge: 'Tổng hợp' },
];

export const PAPER_TEMPLATES: { id: PageTemplate; label: string; desc: string; badge?: string }[] = [
  { id: 'cornell', label: 'Cornell Notes', desc: 'Cue + Notes + Summary (Khuyên dùng cho học Y)', badge: 'Phổ biến nhất' },
  { id: 'ruled', label: 'Kẻ ngang (Ruled)', desc: 'Dòng kẻ chuẩn có lề ghi chú bài giảng' },
  { id: 'grid', label: 'Ô ly 5mm (Grid)', desc: 'Vẽ sơ đồ giải phẫu, mô học, đồ thị' },
  { id: 'dot', label: 'Chấm bi (Dot Grid)', desc: 'Phác thảo tự do, sơ đồ tư duy' },
  { id: 'blank', label: 'Trắng trơn (Blank)', desc: 'Không dòng kẻ' },
];

export const NewNotebookModal: React.FC<NewNotebookModalProps> = ({
  isOpen,
  onClose,
  folders,
  currentFolderId,
  onCreate,
  isDarkMode,
}) => {
  const [title, setTitle] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplate>('cornell');
  const [selectedCover, setSelectedCover] = useState(NOTEBOOK_COVERS[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || 'Sổ tay Y khoa mới';
    onCreate(finalTitle, selectedTemplate, selectedFolderId, selectedCover.color);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Modal Header */}
        <div className="h-14 px-6 border-b flex items-center justify-between border-inherit">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-bold">Tạo sổ tay mới (New Notebook)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* 1. Notebook Title */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-zinc-500 uppercase tracking-wider">
              Tên sổ tay
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Giải phẫu học lâm sàng, Sinh lý tủy sống..."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-hidden font-medium transition-all ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700 focus:border-blue-500'
                  : 'bg-slate-50 border-slate-200 focus:border-blue-500'
              }`}
              autoFocus
            />
          </div>

          {/* 2. Folder Selection */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-zinc-500 uppercase tracking-wider">
              Thư mục / Môn học
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  selectedFolderId === null
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                    : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Chung (Tất cả)
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    selectedFolderId === folder.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {folder.name}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Choose Cover Style */}
          <div>
            <label className="block text-xs font-semibold mb-2 text-zinc-500 uppercase tracking-wider">
              Chọn màu bìa sổ (Cover)
            </label>
            <div className="grid grid-cols-6 gap-3">
              {NOTEBOOK_COVERS.map((cover) => {
                const isSelected = selectedCover.id === cover.id;
                return (
                  <button
                    key={cover.id}
                    type="button"
                    onClick={() => setSelectedCover(cover)}
                    className={`aspect-[1/1.3] rounded-xl flex flex-col items-center justify-between p-2 border transition-all cursor-pointer relative shadow-sm ${
                      isSelected
                        ? 'ring-3 ring-blue-500 scale-105 border-transparent'
                        : 'hover:scale-102 border-black/10'
                    }`}
                    style={{ backgroundColor: cover.color }}
                  >
                    <div className="w-full h-1 bg-white/30 rounded-full" />
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-3" />
                      </div>
                    )}
                    <span className="text-[9px] font-bold text-white/80 tracking-tight">
                      {cover.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Choose Paper Template */}
          <div>
            <label className="block text-xs font-semibold mb-2 text-zinc-500 uppercase tracking-wider">
              Chọn mẫu giấy ghi chú (Paper Template)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PAPER_TEMPLATES.map((tpl) => {
                const isSelected = selectedTemplate === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`p-3 rounded-xl border flex items-start justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          {tpl.label}
                        </span>
                        {tpl.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-medium">
                            {tpl.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{tpl.desc}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-inherit">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer transition-colors"
            >
              Tạo sổ tay & Bắt đầu viết
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

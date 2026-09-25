import React, { useState, useRef } from 'react';
import type { LibraryWallpaperConfig, LibraryWallpaperType } from '../../types/document';
import {
  X,
  Check,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Sliders,
  Eye,
  Video,
  Link as LinkIcon,
  Play,
  RotateCcw,
} from 'lucide-react';
import { STATIC_WALLPAPER_IMAGES, extractYouTubeId } from '../Library/LibraryBackground';

interface WallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LibraryWallpaperConfig;
  onSaveConfig: (config: LibraryWallpaperConfig) => void;
  isDarkMode: boolean;
}

export const ANIMATED_PRESETS: { id: LibraryWallpaperType; name: string; desc: string; previewClass: string }[] = [
  {
    id: 'animated_aurora',
    name: 'Cực quang Aurora',
    desc: 'Dải màu ánh sáng xanh lục & tím uốn lượn',
    previewClass: 'bg-gradient-to-tr from-emerald-600 via-indigo-700 to-teal-500',
  },
  {
    id: 'animated_ocean',
    name: 'Đại dương xanh thẳm',
    desc: 'Làn sóng biển xanh êm dịu, thư giãn mắt',
    previewClass: 'bg-gradient-to-br from-cyan-600 via-blue-800 to-sky-600',
  },
  {
    id: 'animated_sunset',
    name: 'Hoàng hôn mơ màng',
    desc: 'Ánh tà dương ấm áp với tông hồng pastel & hổ phách',
    previewClass: 'bg-gradient-to-tr from-rose-600 via-purple-700 to-amber-500',
  },
  {
    id: 'animated_stars',
    name: 'Bầu trời đêm đầy sao',
    desc: 'Không gian tĩnh lặng với các vì sao lấp lánh',
    previewClass: 'bg-gradient-to-b from-blue-950 via-zinc-900 to-black',
  },
  {
    id: 'animated_pulse',
    name: 'Mạng lưới Cyber Pulse',
    desc: 'Lưới tọa độ công nghệ với nhịp tim y khoa',
    previewClass: 'bg-zinc-900 border border-cyan-500/30',
  },
];

export const STATIC_PRESETS: { id: LibraryWallpaperType; name: string; desc: string }[] = [
  {
    id: 'static_desk',
    name: 'Bàn học ấm cúng (Cozy Desk)',
    desc: 'Góc học tập phong cách Lo-Fi với ánh đèn bàn và sách vở',
  },
  {
    id: 'static_library',
    name: 'Thư viện Y khoa cổ điển',
    desc: 'Kệ sách gỗ sồi trang nghiêm và những cuốn giáo trình kinh điển',
  },
  {
    id: 'static_greenery',
    name: 'Khu vườn nhiệt đới thư giãn',
    desc: 'Cây xanh dịu mát giúp giảm căng thẳng sau giờ học',
  },
  {
    id: 'static_mountain',
    name: 'Núi sương mù Bắc Âu',
    desc: 'Phong cảnh thiên nhiên tối giản, thanh tịnh',
  },
];

export const YOUTUBE_PRESETS = [
  {
    title: 'Lofi Girl - Relax & Study Beats',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    id: 'jfKfPfyJRdk',
    desc: 'Âm nhạc Lo-Fi kinh điển, thư thái nhẹ nhàng',
  },
  {
    title: 'Cozy Coffee Shop with Soft Rain',
    url: 'https://www.youtube.com/watch?v=e3L1PIY1pN8',
    id: 'e3L1PIY1pN8',
    desc: 'Quán cà phê ấm cúng kèm tiếng mưa rơi êm dịu',
  },
  {
    title: 'Medical Study with Me & Piano',
    url: 'https://www.youtube.com/watch?v=S4L8T2kFFck',
    id: 'S4L8T2kFFck',
    desc: 'Không gian học tập chuyên nghiệp, piano cổ điển',
  },
  {
    title: 'Synthwave Chill / Night Drive',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    id: '4xDzrJKXOOY',
    desc: 'Ánh đèn neon hoài niệm phong cách Synthwave',
  },
];

export const WallpaperModal: React.FC<WallpaperModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  isDarkMode,
}) => {
  const [selectedType, setSelectedType] = useState<LibraryWallpaperType>(config.type);
  const [customImageUrl, setCustomImageUrl] = useState<string | undefined>(config.customImageUrl);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [youtubeUrl, setYoutubeUrl] = useState<string>(config.youtubeUrl || '');
  const [blurLevel, setBlurLevel] = useState<number>(config.blurLevel ?? 4);
  const [dimLevel, setDimLevel] = useState<number>(config.dimLevel ?? 35);
  const [activeTab, setActiveTab] = useState<'animated' | 'static' | 'youtube' | 'custom'>('animated');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const currentYoutubeId = extractYouTubeId(youtubeUrl);

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomImageUrl(reader.result);
        setSelectedType('custom_image');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setCustomImageUrl(imageUrlInput.trim());
    setSelectedType('custom_image');
    setImageUrlInput('');
  };

  const handleApplyYouTubeUrl = (url: string) => {
    const id = extractYouTubeId(url);
    if (!id) {
      alert('Không nhận diện được ID video YouTube hợp lệ. Vui lòng kiểm tra lại đường link.');
      return;
    }
    setYoutubeUrl(url);
    setSelectedType('youtube_video');
  };

  const handleSave = () => {
    const ytId = youtubeUrl ? extractYouTubeId(youtubeUrl) : undefined;
    onSaveConfig({
      type: selectedType,
      customImageUrl: selectedType === 'custom_image' ? customImageUrl : undefined,
      youtubeUrl: selectedType === 'youtube_video' ? youtubeUrl : undefined,
      youtubeVideoId: selectedType === 'youtube_video' ? (ytId || undefined) : undefined,
      blurLevel,
      dimLevel,
    });
    onClose();
  };

  const handleResetDefault = () => {
    setSelectedType('default');
    setBlurLevel(0);
    setDimLevel(0);
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
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold">Hình nền & Video nền Trang chủ</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-6 pt-4 border-b border-inherit flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('animated')}
            className={`px-3 py-2 border-b-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'animated'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nền động Flow</span>
          </button>

          <button
            onClick={() => setActiveTab('youtube')}
            className={`px-3 py-2 border-b-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'youtube'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-red-500" />
            <span>Video YouTube (Nền lofi)</span>
          </button>

          <button
            onClick={() => setActiveTab('static')}
            className={`px-3 py-2 border-b-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'static'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Ảnh tĩnh có sẵn</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`px-3 py-2 border-b-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'custom'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tải ảnh / Link ảnh</span>
          </button>

          <button
            onClick={handleResetDefault}
            className={`ml-auto px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
              selectedType === 'default'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-400'
            }`}
          >
            Mặc định
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCustomImageUpload}
        />

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Tab 1: Animated Presets */}
          {activeTab === 'animated' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ANIMATED_PRESETS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedType(item.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 relative ${
                    selectedType === item.id
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                      : isDarkMode
                      ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-850/50'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-lg shadow-inner shrink-0 ${item.previewClass} flex items-center justify-center`}
                  >
                    <Sparkles className="w-5 h-5 text-white/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-100 flex items-center justify-between">
                      <span>{item.name}</span>
                      {selectedType === item.id && (
                        <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: YouTube Video */}
          {activeTab === 'youtube' && (
            <div className="space-y-4">
              {/* URL Input */}
              <div className="p-4 rounded-xl border border-inherit bg-slate-50/50 dark:bg-zinc-850/40 space-y-2.5">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-red-500" />
                  <span>Dán đường link YouTube (Video lofi study, chill music, khung cảnh...)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="VD: https://www.youtube.com/watch?v=jfKfPfyJRdk"
                    className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-hidden ${
                      isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-slate-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyYouTubeUrl(youtubeUrl)}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    Dùng video này
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Video sẽ tự động chạy ngầm toàn màn hình (không có quảng cáo và nút điều khiển gây vướng víu), tạo cảm giác như đang ngồi học tại quán cà phê hoặc phòng đọc yên tĩnh.
                </p>
              </div>

              {/* YouTube Video Preview if ID available */}
              {currentYoutubeId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                    <span>Xem trước video nền:</span>
                    {selectedType === 'youtube_video' && (
                      <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Đã chọn làm hình nền
                      </span>
                    )}
                  </div>
                  <div className="aspect-video w-full rounded-xl overflow-hidden border border-inherit shadow-md bg-black relative">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${currentYoutubeId}?autoplay=1&mute=1&controls=1&loop=1&playlist=${currentYoutubeId}`}
                      title="YouTube Preview"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                </div>
              )}

              {/* Quick Preset Videos */}
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5">
                  Gợi ý video không gian học tập phổ biến:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {YOUTUBE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyYouTubeUrl(p.url)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-3 ${
                        selectedType === 'youtube_video' && currentYoutubeId === p.id
                          ? 'border-red-500 bg-red-50/40 dark:bg-red-950/30 ring-2 ring-red-500/20'
                          : isDarkMode
                          ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-850/50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="w-16 aspect-video rounded-lg overflow-hidden relative shrink-0 bg-zinc-800">
                        <img
                          src={`https://img.youtube.com/vi/${p.id}/mqdefault.jpg`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate">
                          {p.title}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">{p.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Static Presets */}
          {activeTab === 'static' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STATIC_PRESETS.map((item) => {
                const img = STATIC_WALLPAPER_IMAGES[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedType(item.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 relative ${
                      selectedType === item.id
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : isDarkMode
                        ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-850/50'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                    }`}
                  >
                    <div
                      className="w-16 h-14 rounded-lg bg-cover bg-center shrink-0 shadow-inner"
                      style={{ backgroundImage: `url(${img})` }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-zinc-100 flex items-center justify-between">
                        <span className="truncate">{item.name}</span>
                        {selectedType === item.id && (
                          <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 4: Custom Upload or URL */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              {/* Option 1: File Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  isDarkMode
                    ? 'border-zinc-700 hover:border-indigo-500 hover:bg-zinc-800/50'
                    : 'border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/30'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    Bấm để tải ảnh từ iPad hoặc máy tính
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Hỗ trợ JPG, PNG, WebP (Khuyên dùng 1920x1080)
                  </p>
                </div>
              </div>

              {/* Option 2: Image URL input */}
              <div className="p-4 rounded-xl border border-inherit bg-slate-50/50 dark:bg-zinc-850/40 space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span>Hoặc dán link hình ảnh trực tiếp từ Web:</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="VD: https://images.unsplash.com/photo-..."
                    className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-hidden ${
                      isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-slate-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleApplyImageUrl}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-2xs"
                  >
                    Dùng ảnh này
                  </button>
                </div>
              </div>

              {/* Current Active Custom Image */}
              {customImageUrl && (
                <div className="p-3 rounded-xl border border-inherit flex items-center gap-3">
                  <div
                    className="w-16 h-12 rounded-lg bg-cover bg-center shrink-0 shadow-xs border border-white/20"
                    style={{ backgroundImage: `url(${customImageUrl})` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span className="truncate">Ảnh cá nhân đã thiết lập</span>
                      {selectedType === 'custom_image' && (
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedType('custom_image')}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                      >
                        Kích hoạt làm hình nền
                      </button>
                      <span className="text-zinc-300 dark:text-zinc-700">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomImageUrl(undefined);
                          if (selectedType === 'custom_image') setSelectedType('default');
                        }}
                        className="text-[11px] text-rose-500 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Xóa ảnh</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sliders for Blur and Dimming */}
          {selectedType !== 'default' && (
            <div className="p-4 rounded-xl border border-inherit bg-slate-50/50 dark:bg-zinc-850/40 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5" />
                <span>Điều chỉnh độ mờ & độ tương phản</span>
              </div>

              {/* Blur Level */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  <span>Làm mờ hậu cảnh (Blur)</span>
                  <span className="font-mono text-zinc-400">{blurLevel}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={blurLevel}
                  onChange={(e) => setBlurLevel(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Dim Level */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  <span>Độ phủ tối / Tương phản (Dim level)</span>
                  <span className="font-mono text-zinc-400">{dimLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="70"
                  step="5"
                  value={dimLevel}
                  onChange={(e) => setDimLevel(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-16 px-6 border-t flex items-center justify-between border-inherit bg-slate-50/50 dark:bg-zinc-950/50">
          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>Hình nền được tự động lưu trên trình duyệt</span>
          </div>

          <div className="flex items-center gap-2.5">
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
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Áp dụng hình nền</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

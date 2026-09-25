import React from 'react';
import type { LibraryWallpaperConfig } from '../../types/document';

interface LibraryBackgroundProps {
  config: LibraryWallpaperConfig;
  isDarkMode: boolean;
}

export const STATIC_WALLPAPER_IMAGES: Record<string, string> = {
  static_desk: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2000&q=80',
  static_library: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=2000&q=80',
  static_greenery: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=2000&q=80',
  static_mountain: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=80',
};

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);
  return match && match[1] ? match[1] : null;
}

export const LibraryBackground: React.FC<LibraryBackgroundProps> = ({
  config,
  isDarkMode,
}) => {
  if (config.type === 'default') {
    return null;
  }

  // Determine background content
  const isAnimated = config.type.startsWith('animated_');
  const isStatic = config.type.startsWith('static_') || config.type === 'custom_image';
  const imageUrl =
    config.type === 'custom_image'
      ? config.customImageUrl
      : STATIC_WALLPAPER_IMAGES[config.type];

  const youtubeVideoId =
    config.type === 'youtube_video'
      ? config.youtubeVideoId || (config.youtubeUrl ? extractYouTubeId(config.youtubeUrl) : null)
      : null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* 1. Animated Gradients */}
      {isAnimated && (
        <>
          {config.type === 'animated_aurora' && (
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900 via-indigo-950 to-teal-900 animate-aurora opacity-90" />
          )}

          {config.type === 'animated_ocean' && (
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-900 via-blue-950 to-sky-900 animate-ocean opacity-90" />
          )}

          {config.type === 'animated_sunset' && (
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-950 via-purple-950 to-amber-950 animate-sunset opacity-90" />
          )}

          {config.type === 'animated_stars' && (
            <div className="absolute inset-0 bg-zinc-950">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950 via-zinc-950 to-black" />
              {/* Twinkling star particle overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-20 animate-pulse" />
            </div>
          )}

          {config.type === 'animated_pulse' && (
            <div className="absolute inset-0 bg-zinc-950">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#0284c715_1px,transparent_1px),linear-gradient(to_bottom,#0284c715_1px,transparent_1px)] bg-[size:4rem_4rem]" />
              <div className="absolute inset-0 bg-radial from-blue-900/20 via-transparent to-transparent" />
            </div>
          )}
        </>
      )}

      {/* 2. Static Wallpaper Image (from URL or Upload) */}
      {isStatic && imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url(${imageUrl})`,
            filter: `blur(${config.blurLevel}px)`,
            transform: 'scale(1.05)', // Prevent edge blur artifacts
          }}
        />
      )}

      {/* 3. YouTube Ambient Video Background */}
      {config.type === 'youtube_video' && youtubeVideoId && (
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none transition-all duration-500"
          style={{
            filter: `blur(${config.blurLevel}px)`,
          }}
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeVideoId}&playsinline=1&rel=0&showinfo=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0`}
            title="Ambient Study Background"
            className="w-[130vw] h-[130vh] -top-[15vh] -left-[15vw] absolute object-cover border-0 pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      )}

      {/* 4. Dark/Light Dimming Tint Overlay for maximum legibility */}
      <div
        className="absolute inset-0 transition-colors"
        style={{
          backgroundColor: isDarkMode
            ? `rgba(9, 9, 11, ${config.dimLevel / 100})`
            : `rgba(248, 250, 252, ${config.dimLevel / 100})`,
        }}
      />
    </div>
  );
};

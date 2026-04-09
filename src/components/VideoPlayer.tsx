import { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, X } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  poster?: string;
  className?: string;
}

export function VideoPlayer({ url, poster, className = '' }: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else          { ref.current.play(); setPlaying(true);  }
  };

  const onTimeUpdate = () => {
    if (!ref.current) return;
    const pct = (ref.current.currentTime / (ref.current.duration || 1)) * 100;
    setProgress(pct);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    ref.current.currentTime = (x / rect.width) * ref.current.duration;
  };

  return (
    <div className={`relative group rounded-lg overflow-hidden bg-black ${className}`}>
      <video
        ref={ref}
        src={url}
        poster={poster}
        muted={muted}
        onTimeUpdate={onTimeUpdate}
        onEnded={() => setPlaying(false)}
        className="w-full h-full object-contain"
        onClick={toggle}
      />

      {/* Controls overlay */}
      <div className={`
        absolute inset-0 flex flex-col justify-end
        bg-gradient-to-t from-black/70 via-transparent to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-200
      `}>
        {/* Progress bar */}
        <div
          className="mx-3 mb-2 h-1 bg-white/20 rounded-full cursor-pointer relative"
          onClick={seek}
        >
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 px-3 pb-3">
          <button onClick={toggle} className="text-white hover:text-primary transition-colors">
            {playing
              ? <Pause className="w-4 h-4" />
              : <Play className="w-4 h-4" />
            }
          </button>
          <button
            onClick={() => { setMuted(m => !m); if (ref.current) ref.current.muted = !muted; }}
            className="text-white hover:text-primary transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => ref.current?.requestFullscreen()}
            className="ml-auto text-white hover:text-primary transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Big play button when paused */}
      {!playing && (
        <button
          onClick={toggle}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20 hover:bg-black/70 hover:scale-105 transition-all">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </button>
      )}
    </div>
  );
}

/* Modal para abrir vídeo/imagem em fullscreen */
interface MediaModalProps {
  url: string;
  type: 'video' | 'image';
  onClose: () => void;
}

export function MediaModal({ url, type, onClose }: MediaModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-2"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>

      <div
        className="max-w-4xl max-h-[90vh] w-full mx-4 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {type === 'video' ? (
          <VideoPlayer url={url} className="w-full aspect-video" />
        ) : (
          <img
            src={url}
            alt="Post"
            className="w-full max-h-[90vh] object-contain rounded-lg"
          />
        )}
      </div>
    </div>
  );
}

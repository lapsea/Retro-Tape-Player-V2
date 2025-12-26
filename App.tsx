import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  BatteryMedium, 
  Bluetooth, 
  Disc3,
  Wifi,
  Radio,
  ListMusic,
  Music,
  Video as VideoIcon
} from 'lucide-react';

// --- Types ---
interface Song {
  title: string;
  artist: string;
  src: string;
  id: string; // unique id for key
  type: 'audio' | 'video';
}

// --- Helper Components ---

// SVG Reel Component for the screen
const DigitalReel = ({ isPlaying, reverse = false }: { isPlaying: boolean; reverse?: boolean }) => {
  return (
    <div className="relative w-20 h-20 flex items-center justify-center opacity-80">
      {/* Static Crosshair */}
      <div className="absolute w-full h-[2px] bg-red-500/20"></div>
      <div className="absolute h-full w-[2px] bg-red-500/20"></div>
      
      {/* Rotating Ring */}
      <svg 
        viewBox="0 0 100 100" 
        className={`w-full h-full opacity-80 ${isPlaying ? (reverse ? 'animate-[spin_4s_linear_infinite_reverse]' : 'animate-[spin_4s_linear_infinite]') : ''}`}
      >
        {/* Dashed Circle */}
        <circle 
          cx="50" cy="50" r="46" 
          fill="none" 
          stroke="#ccc" 
          strokeWidth="3" 
          strokeDasharray="4 4"
          className="opacity-70"
        />
        {/* Inner segments */}
        <path d="M 50 10 L 50 25" stroke="#ccc" strokeWidth="3" />
        <path d="M 50 90 L 50 75" stroke="#ccc" strokeWidth="3" />
        <path d="M 10 50 L 25 50" stroke="#ccc" strokeWidth="3" />
        <path d="M 90 50 L 75 50" stroke="#ccc" strokeWidth="3" />
      </svg>

      {/* Center Red Eye */}
      <div className="absolute w-6 h-6 rounded-full border border-red-500/60 bg-red-900/40 flex items-center justify-center">
        <div className="w-2 h-2 bg-red-600 rounded-full shadow-[0_0_8px_#ef4444]"></div>
      </div>
    </div>
  );
};

// The Screen Component
const RetroScreen = ({ 
  isPlaying, 
  currentTime, 
  title, 
  artist,
  showPlaylist,
  playlist,
  currentSongIndex,
  onSelectSong,
  analyser,
  mediaRef,
  onSongEnd
}: { 
  isPlaying: boolean; 
  currentTime: string;
  title: string;
  artist: string;
  showPlaylist: boolean;
  playlist: Song[];
  currentSongIndex: number;
  onSelectSong: (index: number) => void;
  analyser: AnalyserNode | null;
  mediaRef: React.RefObject<HTMLVideoElement>;
  onSongEnd: () => void;
}) => {
  const bearImgRef = useRef<HTMLImageElement>(null);
  
  const currentSong = playlist[currentSongIndex];
  const isVideo = currentSong?.type === 'video';

  // Audio Reactive Bear Animation
  useEffect(() => {
    let rafId: number;
    
    const animateBear = () => {
      if (isPlaying && analyser && bearImgRef.current && !isVideo) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Calculate bass energy (using first few bins)
        // fftSize is 256, so bin 0-2 covers sub-bass/bass roughly
        const bass = (dataArray[0] + dataArray[1] + dataArray[2]) / 3;
        
        // Map bass (0-255) to scale (1.0 - 1.15)
        const scale = 1 + (bass / 255) * 0.15;
        
        // Map bass to brightness boost (75% base -> 110% max)
        const brightness = 75 + (bass / 255) * 35;

        bearImgRef.current.style.transform = `scale(${scale})`;
        bearImgRef.current.style.filter = `grayscale(100%) contrast(1.4) brightness(${brightness}%)`;

        rafId = requestAnimationFrame(animateBear);
      } else if (!isPlaying && bearImgRef.current) {
        // Reset when paused
        bearImgRef.current.style.transform = 'scale(1)';
        bearImgRef.current.style.filter = 'grayscale(100%) contrast(1.4) brightness(75%)';
      }
    };

    if (isPlaying) {
      animateBear();
    } else {
      // Ensure reset state if stopped
      if (bearImgRef.current) {
         bearImgRef.current.style.transform = 'scale(1)';
         bearImgRef.current.style.filter = 'grayscale(100%) contrast(1.4) brightness(75%)';
      }
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isPlaying, analyser, isVideo]);

  return (
    <div className="relative w-full aspect-[4/3] bg-[#1a1a1a] rounded-lg overflow-hidden p-[2px] shadow-[inset_0_0_30px_rgba(0,0,0,1)] border-[6px] border-[#999990] ring-1 ring-black/20">
      
      {/* 1. Vignette (Dark corners) */}
      <div className="absolute inset-0 bg-vignette z-50 pointer-events-none rounded-lg"></div>

      {/* 2. Screen Inner Bezel/Shadow */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] z-40 rounded-sm"></div>
      
      {/* 3. Noise Overlay - Grain effect */}
      <div className="absolute inset-0 bg-noise z-30 pointer-events-none opacity-[0.15] mix-blend-overlay"></div>
      
      {/* 4. LCD Mesh Overlay - The Physical Pixels (Grid) */}
      <div className="absolute inset-0 bg-lcd-mesh z-30 pointer-events-none opacity-50 mix-blend-hard-light"></div>
      
      {/* 5. Scanlines */}
      <div className="absolute inset-0 bg-scanlines z-30 pointer-events-none opacity-30 mix-blend-multiply"></div>

      {/* The Content Layer */}
      {/* Applied crt-bloom and animate-flicker here for the 'simulation' look */}
      <div className="relative h-full w-full bg-[#111] flex flex-col font-dot-matrix p-5 z-10 text-gray-200 overflow-hidden crt-bloom animate-flicker">
        
        {/* --- VIDEO ELEMENT (Background Layer) --- */}
        {/* We keep this mounted always so playback doesn't stop when switching views */}
        <video 
          ref={mediaRef}
          crossOrigin="anonymous"
          onEnded={onSongEnd}
          className={`
            absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500
            ${isVideo && !showPlaylist ? 'opacity-100' : 'opacity-0'}
          `}
          // Mute video element if we want to rely on WebAudio, but WebAudio connects to it so it's fine.
          // Note: If we use display:none, some browsers stop playback optimization. Opacity 0 is safer.
        />

        {/* Header Status Bar - Simplified to only show time */}
        <div className="relative z-10 flex justify-between items-center border-b border-gray-500/30 pb-2 mb-2 min-h-[32px] shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-400 text-crt">
               {showPlaylist ? <ListMusic size={14} /> : (isVideo ? <VideoIcon size={14} /> : <Music size={14} />)}
               <span className="tracking-widest uppercase">{showPlaylist ? "PLAYLIST" : (isVideo ? "VIDEO" : "NOW PLAYING")}</span>
            </div>
            
            {/* Conditional Time Display: Hide if playing video */}
            {!isVideo && (
              <div className="text-[#ff5555] font-bold tracking-widest text-3xl leading-none text-crt" style={{ textShadow: "0 0 15px rgba(255,0,0,0.9)" }}>
                   {currentTime.slice(0, 5)}
              </div>
            )}
        </div>
        
        {/* Dotted Line Separator */}
        <div className="relative z-10 w-full border-b-2 border-dotted border-gray-600/30 mb-2 shrink-0"></div>

        {/* Content Area Switcher */}
        {showPlaylist ? (
           // --- PLAYLIST VIEW ---
           <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden pr-2 scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-red-900/50">
              {playlist.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2 text-crt">
                   <p className="text-sm uppercase tracking-widest">No Tracks</p>
                   <p className="text-[10px] uppercase">Press '1' to add music/video</p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {playlist.map((song, idx) => (
                    <li 
                      key={song.id}
                      onClick={() => onSelectSong(idx)}
                      className={`
                        group flex items-center gap-2 text-sm cursor-pointer p-1 rounded-[2px] transition-colors
                        ${idx === currentSongIndex 
                          ? 'text-red-400 bg-red-900/20 text-crt' 
                          : 'text-gray-400 hover:text-white hover:bg-white/10 text-crt opacity-70 hover:opacity-100'}
                      `}
                    >
                      <span className="w-4 text-[10px] text-right opacity-50">{String(idx + 1).padStart(2, '0')}</span>
                      <span className="truncate flex-1 tracking-wider font-bold">
                        {song.type === 'video' && <span className="mr-1 text-[9px] border border-gray-600 px-0.5 rounded-[1px]">VID</span>}
                        {song.title}
                      </span>
                      {idx === currentSongIndex && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]"></div>}
                    </li>
                  ))}
                </ul>
              )}
           </div>
        ) : (
           // --- PLAYER VIEW ---
           <>
            {/* If video is playing, we just show an empty spacer here because the video element is in the background covering everything */}
            {isVideo ? (
               <div className="flex-1 relative z-10">
                  {/* Video mode keeps the center clear */}
               </div>
            ) : (
               <div className="relative z-10 flex-1 flex items-center justify-between px-2 gap-4">
                  {/* Left Reel */}
                  <DigitalReel isPlaying={isPlaying} />

                  {/* Album Art (Center) */}
                  <div className="relative w-28 h-28 border-[1px] border-white/20 rounded-sm p-[2px] bg-black shadow-[0_0_20px_rgba(255,50,50,0.15)] shrink-0 overflow-hidden">
                      <img 
                          ref={bearImgRef}
                          src="https://picsum.photos/id/433/200/200" 
                          alt="Album"
                          className="w-full h-full object-cover pixelated transition-transform duration-75"
                          style={{ filter: 'grayscale(100%) contrast(1.4) brightness(75%)' }}
                      />
                      <div className="absolute inset-0 bg-red-500/20 mix-blend-color-dodge pointer-events-none"></div>
                  </div>

                  {/* Right Reel */}
                  <DigitalReel isPlaying={isPlaying} reverse={true} />
               </div>
            )}

            {/* Footer Text - Hide if video is playing */}
            {!isVideo && (
              <div className="relative z-10 text-center space-y-1 mt-3 w-full shrink-0">
                  <div className="overflow-hidden">
                      <h2 className="text-2xl text-white tracking-widest uppercase text-crt truncate leading-none w-full opacity-90">
                      {title}
                      </h2>
                  </div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest truncate text-crt opacity-70">
                  {artist}
                  </p>
              </div>
            )}
           </>
        )}

      </div>

      {/* Glass Reflection / Glare */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none z-50 rounded-lg mix-blend-overlay"></div>
    </div>
  );
};

// Button Components
const SquareButton = ({ label, active, onClick }: { label?: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="relative w-full h-full bg-[#e8e8e5] rounded-lg outset-plastic active:inset-concave flex items-center justify-center group transition-all duration-100 overflow-hidden active:scale-[0.98]"
  >
    <div className={`w-12 h-12 rounded-full inset-concave flex items-center justify-center transition-all ${active ? 'translate-y-[1px]' : ''}`}>
      <div className="w-8 h-8 rounded-full bg-[#f0f0ed] shadow-[2px_2px_4px_rgba(255,255,255,1),-1px_-1px_3px_rgba(0,0,0,0.05)]"></div>
    </div>
    {label && <span className="absolute top-1 left-2 text-[10px] font-sans text-gray-400 font-bold">{label}</span>}
  </button>
);

const RectButton = ({ label, onClick }: { label?: string, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="relative w-full h-full bg-[#e8e8e5] rounded-lg outset-plastic active:inset-concave flex items-center justify-center gap-4 transition-all duration-100 overflow-hidden active:scale-[0.98]"
  >
    <div className="w-3 h-3 rounded-full inset-concave bg-gray-100"></div>
    <div className="w-3 h-3 rounded-full inset-concave bg-gray-100"></div>
    {label && <span className="absolute top-1 left-2 text-[10px] font-sans text-gray-400 font-bold">{label}</span>}
  </button>
);

const RedButton = ({ onClick, isPlaying }: { onClick: () => void, isPlaying: boolean }) => (
  <button 
    onClick={onClick}
    className="relative w-full h-full bg-[#cc3a28] rounded-xl shadow-[inset_2px_2px_4px_rgba(255,255,255,0.4),inset_-2px_-2px_4px_rgba(0,0,0,0.3),2px_2px_5px_rgba(0,0,0,0.3)] active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4)] active:scale-[0.98] transition-all flex items-center justify-center overflow-hidden group"
  >
    {/* Deep concave center for the thumb */}
    <div className="w-16 h-16 rounded-full bg-[#b83020] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.4),inset_-1px_-1px_2px_rgba(255,255,255,0.2)] flex items-center justify-center group-active:translate-y-[1px] transition-transform">
       {isPlaying ? <Pause className="text-white/20 drop-shadow-md" size={32} fill="currentColor" /> : <Play className="text-white/20 drop-shadow-md" size={32} fill="currentColor" />}
    </div>
    
    <div className="absolute top-2 left-2">
      <SkipForward size={12} className="text-white/40" />
    </div>
  </button>
);

const SpeakerGrille = ({ onClick, isActive }: { onClick: () => void, isActive: boolean }) => {
  // Fixed grid layout: 3 columns x 6 rows = 18 dots
  // This fits cleanly in the 80x110 container
  const dots = Array.from({ length: 18 }); 
  return (
    <button 
      onClick={onClick}
      className={`
        w-full h-full bg-[#e8e8e5] rounded-xl outset-plastic active:inset-concave p-2 flex items-center justify-center cursor-pointer group active:scale-[0.98] transition-all relative
        ${isActive ? 'ring-2 ring-red-500/20' : ''}
      `}
      title="Toggle Playlist"
    >
      <div className="grid grid-cols-3 gap-x-3 gap-y-2 pointer-events-none">
        {dots.map((_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full shadow-[inset_1px_1px_2px_black] transition-colors ${isActive ? 'bg-gray-800' : 'bg-[#1a1a1a]'}`}></div>
        ))}
      </div>
    </button>
  );
};

const VolumeKnob = ({ volume, setVolume }: { volume: number, setVolume: (v: number) => void }) => {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);

  // Convert volume (0-100) to rotation (-135deg to 135deg)
  const rotation = (volume / 100) * 270 - 135;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !knobRef.current) return;
      
      const sensitivity = 2;
      setVolume(Math.min(100, Math.max(0, volume - e.movementY * sensitivity)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, volume, setVolume]);


  return (
    <div className="w-full h-full bg-[#e8e8e5] rounded-xl outset-plastic relative flex flex-col items-center justify-end p-2 overflow-hidden">
      <span className="absolute top-2 left-3 text-[10px] font-sans font-bold text-gray-400 uppercase">Vol</span>
      
      {/* The Knob */}
      <div 
        ref={knobRef}
        onMouseDown={handleMouseDown}
        className="w-16 h-16 rounded-full bg-[#f0f0ed] shadow-[0_4px_6px_rgba(0,0,0,0.3),inset_1px_1px_2px_white] flex items-center justify-center cursor-ns-resize active:cursor-grabbing mb-2 relative"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {/* Knob texture/marker */}
        <div className="absolute top-2 w-1.5 h-1.5 rounded-full bg-gray-400 inset-concave"></div>
      </div>
    </div>
  );
};

// Real-time Audio Visualizer
const MiniDisplay = ({ isPlaying, analyser }: { isPlaying: boolean; analyser: AnalyserNode | null }) => {
    const BAR_COUNT = 32; 
    const [dataArray, setDataArray] = useState<Uint8Array>(new Uint8Array(BAR_COUNT).fill(2));
    const rafRef = useRef<number>(null);

    useEffect(() => {
        // Animation loop function
        const update = () => {
            if (isPlaying && analyser) {
                const bufferLength = analyser.frequencyBinCount;
                const rawData = new Uint8Array(bufferLength);
                analyser.getByteFrequencyData(rawData);
                
                // We want to map the raw frequency data to our BAR_COUNT.
                // Since fftSize is usually larger than BAR_COUNT, we need to sample or average.
                // For a "delicate" look, simple sampling of the lower frequencies (where music energy is) works best.
                const sampledData = new Uint8Array(BAR_COUNT);
                
                // Focus on the lower-mid frequencies for better visual movement
                // Skipping very high frequencies which are often empty in mp3s
                const usefulBinCount = Math.floor(bufferLength * 0.8);
                const step = usefulBinCount / BAR_COUNT;

                for (let i = 0; i < BAR_COUNT; i++) {
                    const start = Math.floor(i * step);
                    const end = Math.floor((i + 1) * step);
                    let sum = 0;
                    let count = 0;
                    
                    for (let j = start; j < end && j < bufferLength; j++) {
                        sum += rawData[j];
                        count++;
                    }
                    
                    // Add a tiny bit of random noise for "analog" flicker feeling if signal is low
                    const val = count > 0 ? sum / count : 0;
                    sampledData[i] = val; 
                }
                
                setDataArray(sampledData);
                rafRef.current = requestAnimationFrame(update);
            } else {
                // Return to baseline when stopped
                const decayData = dataArray.map(v => Math.max(2, v * 0.9));
                setDataArray(decayData as unknown as Uint8Array);
                if (decayData.some(v => v > 2.5)) {
                    rafRef.current = requestAnimationFrame(update);
                }
            }
        };

        if (isPlaying) {
            update();
        } else {
             // One last frame to clear or start decay
             rafRef.current = requestAnimationFrame(update);
        }

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isPlaying, analyser]);

    return (
        <div className="w-full h-full bg-[#111] rounded-lg shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] border border-white/10 p-2 flex items-center justify-center overflow-hidden relative">
            
            {/* Visualizer Container */}
            <div className="relative z-10 w-full h-full flex items-center justify-center gap-[1px] px-1">
                 {/* Center Line Artifact - Red dotted line look */}
                 <div className="absolute w-full h-[1px] bg-red-900/30 border-t border-dotted border-red-500/20 top-1/2 -translate-y-1/2"></div>
                 
                 {Array.from(dataArray).map((value, i) => {
                     // Normalize height: 0-255 -> 0-100%
                     // Non-linear scaling makes quiet sounds visible and loud sounds not clip too hard
                     const normalized = Math.pow(value / 255, 1.2) * 100;
                     const height = Math.max(4, normalized);
                     
                     return (
                        <div 
                            key={i} 
                            className="flex-1 bg-[#cc3333] rounded-[0.5px] shadow-[0_0_3px_rgba(204,51,51,0.6)]"
                            style={{ 
                                height: `${height}%`,
                                minWidth: '2px', // Thin, delicate bars
                                opacity: Math.min(1, Math.max(0.3, value / 150)) // Fade out quiet bars
                            }}
                        ></div>
                     );
                 })}
            </div>

             {/* Scanlines/Mesh - Reusing the global classes */}
            <div className="absolute inset-0 bg-lcd-mesh opacity-40 pointer-events-none z-20"></div>
            <div className="absolute inset-0 bg-scanlines opacity-20 pointer-events-none z-20"></div>
            
             {/* Reflection */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none z-30"></div>
        </div>
    )
}

// --- Main App ---

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [currentTime, setCurrentTime] = useState("");
  const [showPlaylist, setShowPlaylist] = useState(false);
  
  // Playlist State
  const [playlist, setPlaylist] = useState<Song[]>([
      {
        title: "Giorgio by Moroder",
        artist: "Daft Punk",
        src: "", // No default source for this dummy
        id: "default-1",
        type: 'audio'
      }
  ]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);

  // Web Audio API State
  // We now use a video element for both audio and video playback
  const mediaRef = useRef<HTMLVideoElement>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
  // Click handler timer ref for Button 2
  const clickTimeoutRef = useRef<number | null>(null);

  // Clock Logic
  useEffect(() => {
    const timer = setInterval(() => {
      const date = new Date();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Audio Setup Effect
  useEffect(() => {
    // Only set up once the audio element exists
    if (mediaRef.current && !sourceRef.current) {
        // Create context lazily
        if (!audioContextRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                 audioContextRef.current = new AudioContextClass();
            }
        }
        
        const ctx = audioContextRef.current;
        if (ctx) {
            try {
                // Create nodes
                const source = ctx.createMediaElementSource(mediaRef.current);
                const ana = ctx.createAnalyser();
                
                // Tuned for visuals
                ana.fftSize = 256; // 128 frequency bins
                ana.smoothingTimeConstant = 0.85; // Smoother fallback
                
                // Connect Graph
                source.connect(ana);
                ana.connect(ctx.destination);
                
                // Save refs
                sourceRef.current = source;
                setAnalyser(ana);
            } catch (e) {
                console.error("Audio Context setup failed", e);
            }
        }
    }
  }, []); // Run once on mount (since audio ref is stable in React 19 / DOM)

  // Sync Audio Element source with current playlist item
  useEffect(() => {
      if (mediaRef.current && playlist[currentSongIndex]) {
          const currentSong = playlist[currentSongIndex];
          if (currentSong.src && mediaRef.current.src !== currentSong.src) {
              mediaRef.current.src = currentSong.src;
              if (isPlaying) {
                  mediaRef.current.play().catch(e => console.error(e));
              }
          }
      }
  }, [currentSongIndex, playlist, isPlaying]);

  // Audio Playback Control
  useEffect(() => {
    if (mediaRef.current) {
        if (isPlaying) {
             // Ensure context is running (it suspends on auto-play policies)
             if (audioContextRef.current?.state === 'suspended') {
                 audioContextRef.current.resume();
             }
             
             // Only call play if we have a valid src
             if (mediaRef.current.src && mediaRef.current.src !== window.location.href) {
                 const playPromise = mediaRef.current.play();
                 if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.error("Playback failed:", e);
                        setIsPlaying(false);
                    });
                 }
             }
        } else {
            mediaRef.current.pause();
        }
    }
  }, [isPlaying]);

  // Volume Control
  useEffect(() => {
      if (mediaRef.current) {
          mediaRef.current.volume = volume / 100;
      }
  }, [volume]);

  const togglePlay = async () => {
      if (playlist.length === 0 || !playlist[currentSongIndex].src) return;
      
      if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
      }
      setIsPlaying(!isPlaying);
  };

  const handleUploadClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
          const newSongs: Song[] = Array.from(files).map(file => ({
              title: file.name.replace(/\.[^/.]+$/, ""), // remove extension
              artist: "Local Media",
              src: URL.createObjectURL(file),
              id: Math.random().toString(36).substr(2, 9),
              type: file.type.startsWith('video/') ? 'video' : 'audio'
          }));

          // If it was just the dummy default song, replace it
          if (playlist.length === 1 && !playlist[0].src) {
              setPlaylist(newSongs);
              setCurrentSongIndex(0);
          } else {
              setPlaylist(prev => [...prev, ...newSongs]);
          }

          // Automatically switch to player view to see new files playing
          setShowPlaylist(false);
          setIsPlaying(true);
      }
  };

  const handleSelectSong = (index: number) => {
      setCurrentSongIndex(index);
      setIsPlaying(true);
      setShowPlaylist(false);
      // Ensure context is running when user explicitly selects a song
      if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
      }
  };

  const handleSongEnd = () => {
      if (currentSongIndex < playlist.length - 1) {
          setCurrentSongIndex(prev => prev + 1);
      } else {
          setIsPlaying(false);
      }
  };

  // Logic for Button 2: Single click (Next), Double Click (Prev)
  const handleButton2Click = () => {
      // Ensure audio context is ready if user interacts
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }

      if (clickTimeoutRef.current !== null) {
          // Double click detected -> Previous Song
          window.clearTimeout(clickTimeoutRef.current);
          clickTimeoutRef.current = null;
          
          setCurrentSongIndex(prev => {
              const newIndex = prev - 1;
              return newIndex < 0 ? playlist.length - 1 : newIndex;
          });
          setIsPlaying(true);
      } else {
          // Single click potential -> Wait for possible double click
          clickTimeoutRef.current = window.setTimeout(() => {
              // Time's up, treat as Single Click -> Next Song
              setCurrentSongIndex(prev => {
                  const newIndex = prev + 1;
                  return newIndex >= playlist.length ? 0 : newIndex;
              });
              setIsPlaying(true);
              clickTimeoutRef.current = null;
          }, 300); // 300ms is standard double-click threshold
      }
  };

  const togglePlaylistView = () => {
      setShowPlaylist(!showPlaylist);
  };

  const currentSong = playlist[currentSongIndex] || { title: "No Track", artist: "", type: 'audio' };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-sans py-10 selection:bg-transparent">
      
      {/* Hidden Audio Elements */}
      <input 
        type="file" 
        multiple
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="audio/*,video/*" 
      />
      {/* Video Element is now inside RetroScreen */}

      {/* The Device Case */}
      <div className="
        w-[400px] 
        bg-[#eeebe6] 
        rounded-[40px] 
        p-8 
        shadow-[inset_0_10px_20px_rgba(255,255,255,1),inset_0_-10px_30px_rgba(0,0,0,0.1),0_20px_50px_rgba(0,0,0,0.3),0_0_0_1px_rgba(0,0,0,0.05)]
        relative
      ">
        
        {/* --- Top Section: Screen --- */}
        <div className="mb-6">
            <RetroScreen 
              isPlaying={isPlaying} 
              currentTime={currentTime} 
              title={currentSong.title}
              artist={currentSong.artist}
              showPlaylist={showPlaylist}
              playlist={playlist}
              currentSongIndex={currentSongIndex}
              onSelectSong={handleSelectSong}
              analyser={analyser}
              mediaRef={mediaRef}
              onSongEnd={handleSongEnd}
            />
        </div>

        {/* --- Branding --- */}
        <div className="flex justify-between items-center px-4 mb-4 opacity-50 font-bold text-gray-600 font-mono text-xs tracking-widest uppercase">
            <div className="flex items-center gap-2">
                <Disc3 size={14} />
                <span>Harveyao</span>
                <span className="bg-gray-400 text-[#eeebe6] px-1 rounded-[1px] text-[9px]">v2</span>
            </div>
            <span>K-01-2</span>
        </div>

        {/* --- Bottom Section: Controls Grid --- */}
        <div className="grid grid-cols-[80px_1fr_80px] grid-rows-[80px_110px] gap-4">
            
            {/* Top Row */}
            <div className="col-start-1 row-start-1">
                <SquareButton onClick={handleUploadClick} />
            </div>
            <div className="col-start-2 row-start-1">
                <MiniDisplay isPlaying={isPlaying} analyser={analyser} />
            </div>
            <div className="col-start-3 row-start-1">
                <RectButton onClick={handleButton2Click} />
            </div>

            {/* Bottom Row */}
            <div className="col-start-1 row-start-2">
                <SpeakerGrille onClick={togglePlaylistView} isActive={showPlaylist} />
            </div>
            <div className="col-start-2 row-start-2">
                <RedButton 
                    isPlaying={isPlaying} 
                    onClick={togglePlay} 
                />
            </div>
            <div className="col-start-3 row-start-2">
                <VolumeKnob volume={volume} setVolume={setVolume} />
            </div>

        </div>

      </div>
      
      {/* Reflections/Environment */}
      <div className="mt-8 text-gray-400 text-sm font-mono">
        Designed with Tailwind & React
      </div>
    </div>
  );
}
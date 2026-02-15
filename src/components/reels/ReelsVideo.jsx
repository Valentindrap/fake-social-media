import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Send, MoreHorizontal, Music, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';

export default function ReelsVideo({ reel, isActive }) {
    const videoRef = useRef(null);
    const [muted, setMuted] = useState(false);
    const [liked, setLiked] = useState(false);

    // Auto-play / pause based on active state
    useEffect(() => {
        if (!videoRef.current) return;
        if (isActive) {
            videoRef.current.play().catch(err => console.log("Auto-play blocked", err));
        } else {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    }, [isActive]);

    const toggleMute = (e) => {
        e.stopPropagation();
        setMuted(!muted);
    };

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
            <video
                ref={videoRef}
                src={reel.url}
                loop
                muted={muted}
                playsInline
                className="w-full h-full object-cover"
                onClick={toggleMute}
            />

            {/* Overlay UI */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

            {/* Right Side Actions */}
            <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-10">
                <div className="flex flex-col items-center gap-1 group cursor-pointer pointer-events-auto" onClick={() => setLiked(!liked)}>
                    <motion.div whileTap={{ scale: 0.7 }}>
                        <Heart className={`h-8 w-8 ${liked ? 'text-red-500 fill-red-500' : 'text-white'}`} strokeWidth={2} />
                    </motion.div>
                    <span className="text-white text-xs font-semibold shadow-sm">{reel.likes}</span>
                </div>

                <div className="flex flex-col items-center gap-1 cursor-pointer pointer-events-auto">
                    <MessageCircle className="h-8 w-8 text-white" strokeWidth={2} />
                    <span className="text-white text-xs font-semibold shadow-sm">{reel.comments}</span>
                </div>

                <div className="cursor-pointer pointer-events-auto">
                    <Send className="h-7 w-7 text-white" strokeWidth={2} />
                </div>

                <div className="cursor-pointer pointer-events-auto">
                    <MoreHorizontal className="h-7 w-7 text-white" strokeWidth={2} />
                </div>

                <div className="w-8 h-8 rounded-lg border-2 border-white overflow-hidden animate-spin-slow pointer-events-auto">
                    <img src={reel.user.avatar} className="w-full h-full object-cover" alt="music" />
                </div>
            </div>

            {/* Bottom Info */}
            <div className="absolute left-4 right-16 bottom-10 z-10 flex flex-col gap-3 pointer-events-none">
                <div className="flex items-center gap-3 pointer-events-auto cursor-pointer group">
                    <Avatar className="h-9 w-9 border border-white/20">
                        <AvatarImage src={reel.user.avatar} />
                        <AvatarFallback>{reel.user.username[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-white font-bold text-sm flex items-center gap-1 drop-shadow-lg">
                        {reel.user.username}
                        {reel.user.isVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
                    </span>
                    <button className="text-white text-xs font-bold border border-white/40 h-7 px-3 rounded-lg hover:bg-white/10 transition-colors ml-1">
                        Seguir
                    </button>
                </div>

                <p className="text-white text-sm line-clamp-2 drop-shadow-md pointer-events-auto">
                    {reel.caption}
                </p>

                <div className="flex items-center gap-2 text-white/90 text-sm pointer-events-auto cursor-pointer">
                    <Music className="h-4 w-4" />
                    <div className="overflow-hidden whitespace-nowrap w-40">
                        <motion.div
                            animate={{ x: [0, -100] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                            className="inline-block"
                        >
                            Audio original • {reel.user.username} •
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Mute Indicator */}
            {muted && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-black/40 p-4 rounded-full backdrop-blur-md"
                    >
                        <Zap className="h-8 w-8 text-white fill-white" />
                    </motion.div>
                </div>
            )}
        </div>
    );
}

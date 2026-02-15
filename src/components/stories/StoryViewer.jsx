import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

const STORY_DURATION = 5000; // 5 seconds per story

export default function StoryViewer({ stories, initialIndex = 0, user, onClose, onDelete, isOwner }) {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [progress, setProgress] = useState(0);
    const progressTimerRef = useRef(null);
    const startTimeRef = useRef(null);
    const currentStory = stories[currentIndex];

    // Sync initial index
    useEffect(() => {
        if (typeof initialIndex === 'number' && initialIndex >= 0 && initialIndex < stories.length) {
            setCurrentIndex(initialIndex);
            setProgress(0);
        }
    }, [initialIndex, stories.length]);

    // Timer logic for auto-advance
    useEffect(() => {
        if (!currentStory) return;

        setProgress(0);
        startTimeRef.current = Date.now();

        const updateProgress = () => {
            const now = Date.now();
            const elapsed = now - startTimeRef.current;
            const newProgress = Math.min((elapsed / STORY_DURATION) * 100, 100);
            setProgress(newProgress);

            if (newProgress < 100) {
                progressTimerRef.current = requestAnimationFrame(updateProgress);
            } else {
                handleAutoNext();
            }
        };

        progressTimerRef.current = requestAnimationFrame(updateProgress);

        return () => {
            if (progressTimerRef.current) cancelAnimationFrame(progressTimerRef.current);
        };
    }, [currentIndex, currentStory]);

    const handleAutoNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const nextStory = (e) => {
        if (e) e.stopPropagation();
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const prevStory = (e) => {
        if (e) e.stopPropagation();
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(currentStory);
        }
    };

    if (!currentStory) return null;

    const content = (
        <AnimatePresence mode="wait">
            <motion.div
                key="story-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[999999] bg-black md:bg-black/95 flex items-center justify-center sm:p-4"
                onClick={onClose}
            >
                {/* Close button (always top right, above everything) */}
                <button
                    onClick={onClose}
                    className="fixed top-6 right-6 z-[1000000] text-white/70 hover:text-white transition-all hover:scale-110 p-2 bg-black/20 rounded-full backdrop-blur-md"
                >
                    <X className="h-8 w-8 drop-shadow-lg" />
                </button>

                <div className="relative h-full w-full max-w-[450px] aspect-[9/16] md:h-[90vh] mx-auto flex flex-col bg-zinc-900 shadow-2xl md:rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

                    {/* Progress bars header */}
                    <div className="absolute top-0 left-0 right-0 p-4 flex gap-1.5 z-50 bg-gradient-to-b from-black/60 to-transparent">
                        {stories.map((s, idx) => (
                            <div key={s.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-white"
                                    initial={false}
                                    animate={{
                                        width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%'
                                    }}
                                    transition={{ type: 'tween', ease: 'linear', duration: 0 }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* User info header */}
                    <div
                        className="absolute top-8 left-4 flex items-center gap-3 z-50 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            navigate(`/profile/${user.username}`);
                        }}
                    >
                        <Avatar className="h-9 w-9 border-2 border-white/30 shadow-xl">
                            <AvatarImage src={user.avatarUrl} />
                            <AvatarFallback>{user.username[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-white font-bold text-sm drop-shadow-lg">{user.username}</span>
                            {currentStory.createdAt && (
                                <span className="text-white/60 text-[10px] font-medium drop-shadow-md">
                                    {new Date(currentStory.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Actions if Owner */}
                    {isOwner && (
                        <button
                            onClick={handleDelete}
                            className="absolute bottom-8 right-6 z-50 text-white/50 hover:text-red-500 transition-all hover:scale-110 p-3 bg-black/20 rounded-full backdrop-blur-md"
                        >
                            <Trash2 className="h-6 w-6" />
                        </button>
                    )}

                    {/* Main Content (Image) */}
                    <div className="flex-1 w-full bg-black relative flex items-center justify-center overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.img
                                key={currentStory.id}
                                src={currentStory.image}
                                className="w-full h-full object-cover sm:object-contain"
                                initial={{ opacity: 0, scale: 1.1 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.4 }}
                            />
                        </AnimatePresence>

                        {/* Navigation Overlay (Invisible split-screen) */}
                        <div className="absolute inset-0 flex z-30">
                            <div className="w-1/3 h-full cursor-pointer" onClick={prevStory} />
                            <div className="w-2/3 h-full cursor-pointer" onClick={nextStory} />
                        </div>
                    </div>

                    {/* Desktop Side Arrows */}
                    <button
                        onClick={prevStory}
                        className={`hidden md:flex fixed left-[calc(50%-320px)] top-1/2 -translate-y-1/2 z-[1000000] text-white/40 hover:text-white transition-all bg-black/20 hover:bg-black/40 p-3 rounded-full backdrop-blur-sm ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : ''}`}
                    >
                        <ChevronLeft className="h-10 w-10" />
                    </button>
                    <button
                        onClick={nextStory}
                        className="hidden md:flex fixed right-[calc(50%-320px)] top-1/2 -translate-y-1/2 z-[1000000] text-white/40 hover:text-white transition-all bg-black/20 hover:bg-black/40 p-3 rounded-full backdrop-blur-sm"
                    >
                        <ChevronRight className="h-10 w-10" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );

    return createPortal(content, document.body);
}

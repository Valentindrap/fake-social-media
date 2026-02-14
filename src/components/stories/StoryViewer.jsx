import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEffect, useState } from 'react';

export default function StoryViewer({ stories, initialIndex = 0, user, onClose, onDelete, isOwner }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const currentStory = stories[currentIndex];

    useEffect(() => {
        if (typeof initialIndex === 'number' && initialIndex >= 0 && initialIndex < stories.length) {
            setCurrentIndex(initialIndex);
        }
    }, [initialIndex, stories]);

    const nextStory = (e) => {
        e.stopPropagation();
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const prevStory = (e) => {
        e.stopPropagation();
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

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 md:p-0"
                onClick={onClose}
            >
                <div className="absolute top-4 right-4 z-20 flex gap-4">
                    {isOwner && (
                        <button onClick={handleDelete} className="text-white hover:text-red-500 transition-colors p-2">
                            <Trash2 className="h-6 w-6 shadow-sm" />
                        </button>
                    )}
                    <button onClick={onClose} className="text-white hover:text-gray-300 transition-colors p-2">
                        <X className="h-8 w-8 shadow-sm" />
                    </button>
                </div>

                <div className="relative h-full w-full max-w-md mx-auto flex flex-col justify-center" onClick={(e) => e.stopPropagation()}>
                    {/* Progress bar */}
                    <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
                        {stories.map((s, idx) => (
                            <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                                <div
                                    className={`h-full bg-white transition-all duration-300 ease-out ${idx === currentIndex ? 'w-full' : idx < currentIndex ? 'w-full' : 'w-0'}`}
                                />
                            </div>
                        ))}
                    </div>

                    {/* User info */}
                    <div className="absolute top-8 left-4 flex items-center gap-3 z-20 cursor-pointer hover:opacity-80 transition-opacity">
                        <Avatar className="h-8 w-8 border border-white/20 shadow-sm">
                            <AvatarImage src={user.avatarUrl} />
                            <AvatarFallback>{user.username[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-white font-semibold text-sm drop-shadow-md">{user.username}</span>
                        {currentStory.createdAt && (
                            <span className="text-white/70 text-xs drop-shadow-md">
                                {new Date(currentStory.createdAt?.seconds * 1000).getHours()}h
                            </span>
                        )}
                    </div>

                    {/* Image Container */}
                    <div className="w-full h-[85vh] flex items-center justify-center relative rounded-lg overflow-hidden">
                        {/* Loader */}
                        <div className="absolute inset-0 flex items-center justify-center z-0">
                            <div className="animate-spin h-8 w-8 border-2 border-white/20 rounded-full border-t-white"></div>
                        </div>

                        {/* Image */}
                        <img
                            src={currentStory.image}
                            className="max-h-full max-w-full object-contain relative z-10"
                            onLoad={(e) => e.target.style.opacity = 1}
                            onError={(e) => console.error("Error loading image", e)}
                        />
                    </div>

                    {/* Navigation Areas */}
                    <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={prevStory} />
                    <div className="absolute inset-y-0 right-0 w-1/3 z-10" onClick={nextStory} />

                    {/* Navigation Arrows (Desktop) */}
                    <button
                        onClick={prevStory}
                        className={`hidden md:flex absolute -left-16 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : ''}`}
                    >
                        <ChevronLeft className="h-10 w-10" />
                    </button>
                    <button
                        onClick={nextStory}
                        className="hidden md:flex absolute -right-16 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    >
                        <ChevronRight className="h-10 w-10" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

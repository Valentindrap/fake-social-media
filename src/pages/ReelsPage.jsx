import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReelsVideo from '@/components/reels/ReelsVideo';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SAMPLE_REELS = [
    {
        id: '1',
        url: 'https://mixkit.imgix.net/videos/preview/mixkit-tree-with-yellow-leaves-in-the-wind-1181-large.mp4',
        user: {
            username: 'nature_lover',
            avatar: 'https://images.pexels.com/users/avatars/123456/nature-1.jpeg',
            isVerified: true
        },
        caption: 'Beautiful waves 🌊 #nature #ocean',
        likes: '12K',
        comments: '450'
    },
    {
        id: '2',
        url: 'https://mixkit.imgix.net/videos/preview/mixkit-city-lights-at-night-with-bokeh-effect-150-large.mp4',
        user: {
            username: 'city_vibes',
            avatar: 'https://images.pexels.com/users/avatars/654321/city-1.jpeg',
            isVerified: false
        },
        caption: 'Neon nights in Tokyo 🌃✨ #travel #tokyo',
        likes: '45K',
        comments: '1.2K'
    },
    {
        id: '3',
        url: 'https://mixkit.imgix.net/videos/preview/mixkit-girl-running-on-the-beach-at-sunset-1249-large.mp4',
        user: {
            username: 'fitness_pro',
            avatar: 'https://images.pexels.com/users/avatars/987654/fit-1.jpeg',
            isVerified: true
        },
        caption: 'Morning workout grind 💪 #fitness #motivation',
        likes: '8K',
        comments: '230'
    }
];

export default function ReelsPage() {
    const navigate = useNavigate();
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef(null);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
        setActiveIndex(index);
    };

    return (
        <div className="fixed inset-0 bg-black z-[60] flex flex-col md:flex-row">
            {/* Back button (Desktop) */}
            <button
                onClick={() => navigate(-1)}
                className="hidden md:flex absolute top-6 left-6 z-[70] text-white hover:bg-white/10 p-2 rounded-full transition-colors"
            >
                <ChevronLeft className="h-8 w-8" />
            </button>

            {/* Vertical Scroll Container */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
                style={{ scrollSnapType: 'y mandatory', height: '100dvh' }}
            >
                {SAMPLE_REELS.map((reel, index) => (
                    <div
                        key={reel.id}
                        className="w-full h-[100dvh] snap-start snap-always relative flex items-center justify-center"
                    >
                        <ReelsVideo
                            reel={reel}
                            isActive={index === activeIndex}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

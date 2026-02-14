import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';

export default function LikeButton({ liked, onToggle, size = 22 }) {
    const [animating, setAnimating] = useState(false);

    const handleClick = () => {
        if (!liked) {
            setAnimating(true);
            setTimeout(() => setAnimating(false), 600);
        }
        onToggle();
    };

    return (
        <motion.button
            onClick={handleClick}
            whileTap={{ scale: 0.75 }}
            className="relative focus:outline-none"
        >
            <AnimatePresence mode="wait">
                {liked ? (
                    <motion.div
                        key="liked"
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.3, 0.9, 1.1, 1] }}
                        exit={{ scale: 0 }}
                        transition={{
                            duration: 0.5,
                            times: [0, 0.3, 0.5, 0.7, 1],
                            ease: 'easeOut',
                        }}
                    >
                        <Heart
                            className="text-papu-coral fill-papu-coral"
                            size={size}
                            strokeWidth={0}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="unliked"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                    >
                        <Heart
                            className="text-foreground hover:text-muted-foreground transition-colors"
                            size={size}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Particle burst on like */}
            <AnimatePresence>
                {animating && (
                    <>
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full bg-papu-coral"
                                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                animate={{
                                    x: Math.cos((i * 60 * Math.PI) / 180) * 20,
                                    y: Math.sin((i * 60 * Math.PI) / 180) * 20,
                                    opacity: 0,
                                    scale: 0,
                                }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                        ))}
                    </>
                )}
            </AnimatePresence>
        </motion.button>
    );
}

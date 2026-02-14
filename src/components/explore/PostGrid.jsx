import { motion } from 'framer-motion';
import { Heart, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PostGrid({ posts }) {
    if (!posts || posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <p>No hay publicaciones para mostrar</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-1 md:gap-4">
            {posts.map((post) => (
                <Link to={`/profile/${post.user.username}`} key={post.id} className="block">
                    <motion.div
                        whileHover={{ opacity: 0.9 }}
                        className="relative aspect-square group cursor-pointer overflow-hidden bg-secondary"
                    >
                        <img
                            src={post.image}
                            alt={post.caption || 'Publicación'}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                        />

                        {/* Hover Overlay (Desktop) */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center gap-6 text-white font-bold">
                            <div className="flex items-center gap-1">
                                <Heart className="fill-white w-5 h-5" />
                                <span>{post.likes || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <MessageCircle className="fill-white w-5 h-5" />
                                <span>{post.comments?.length || 0}</span>
                            </div>
                        </div>
                    </motion.div>
                </Link>
            ))}
        </div>
    );
}

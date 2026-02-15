import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, PlusSquare, Heart, User, Clapperboard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function MobileNav() {
    const { userProfile } = useAuth();

    const navItems = [
        { icon: Home, label: 'Inicio', path: '/' },
        { icon: Search, label: 'Buscar', path: '/search' },
        { icon: Clapperboard, label: 'Reels', path: '/reels' },
        { icon: PlusSquare, label: 'Crear', path: '/create' },
        { icon: Heart, label: 'Actividad', path: '/notifications' },
        {
            label: 'Perfil',
            path: userProfile ? `/profile/${userProfile.username}` : '/login',
            isAvatar: true
        },
    ];

    return (
        <nav className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
            <div className="glass bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/20 rounded-full h-[65px] px-6 flex items-center justify-between">
                {navItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.path}
                        className={({ isActive }) =>
                            `relative flex flex-col items-center justify-center h-full transition-all duration-300 ${isActive ? 'text-foreground scale-110' : 'text-muted-foreground/70 hover:text-foreground'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <motion.div
                                whileTap={{ scale: 0.85 }}
                                className="relative flex items-center justify-center p-1"
                            >
                                {item.isAvatar ? (
                                    <div className={`p-[2px] rounded-full ${isActive ? 'bg-gradient-to-tr from-yellow-400 to-papu-coral' : 'bg-transparent'}`}>
                                        <Avatar className="h-7 w-7 border-2 border-background">
                                            <AvatarImage src={userProfile?.avatarUrl} />
                                            <AvatarFallback className="text-[10px]">{userProfile?.username?.[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                ) : (
                                    <item.icon
                                        className="h-6 w-6"
                                        strokeWidth={isActive ? 2.5 : 1.8}
                                    />
                                )}

                                {/* Active indicator dot - removed for cleaner look, trying glowing icon approach above */}
                                {isActive && !item.isAvatar && (
                                    <motion.div
                                        layoutId="mobile-nav-indicator"
                                        className="absolute -bottom-2 w-1 h-1 rounded-full bg-papu-coral shadow-[0_0_8px_rgba(255,127,80,0.8)]"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </motion.div>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}

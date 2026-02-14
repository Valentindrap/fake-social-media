import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, PlusSquare, Heart, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function MobileNav() {
    const { userProfile } = useAuth();

    const navItems = [
        { icon: Home, label: 'Inicio', path: '/' },
        { icon: Search, label: 'Buscar', path: '/search' },
        { icon: PlusSquare, label: 'Crear', path: '/create' },
        { icon: Heart, label: 'Actividad', path: '/notifications' },
        {
            label: 'Perfil',
            path: userProfile ? `/profile/${userProfile.username}` : '/login',
            isAvatar: true
        },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass bg-background/80 dark:bg-background/90 border-t border-border/50 pb-safe">
            <div className="flex items-center justify-around h-[50px] px-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.path}
                        className={({ isActive }) =>
                            `relative flex flex-col items-center justify-center w-12 h-full transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <motion.div
                                whileTap={{ scale: 0.85 }}
                                className="relative flex items-center justify-center"
                            >
                                {item.isAvatar ? (
                                    <Avatar className={`h-6 w-6 border ${isActive ? 'border-foreground' : 'border-transparent'}`}>
                                        <AvatarImage src={userProfile?.avatarUrl} />
                                        <AvatarFallback className="text-[10px]">{userProfile?.username?.[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <item.icon
                                        className="h-[22px] w-[22px]"
                                        strokeWidth={isActive ? 2.5 : 1.8}
                                    />
                                )}

                                {/* Active indicator dot */}
                                {isActive && !item.isAvatar && (
                                    <motion.div
                                        layoutId="mobile-nav-indicator"
                                        className="absolute -bottom-3 w-1 h-1 rounded-full bg-papu-coral"
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

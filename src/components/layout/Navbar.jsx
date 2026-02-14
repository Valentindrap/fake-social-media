import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, PlusSquare, Heart, MessageCircle, Sun, Moon, Menu, LogOut, Settings, User } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navbar() {
    const { theme, toggleTheme } = useTheme();
    const { currentUser, userProfile, logout } = useAuth();
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 0);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-border/40 ${scrolled
                    ? 'glass bg-background/80 shadow-sm'
                    : 'bg-background'
                }`}
        >
            <div className="max-w-[935px] mx-auto px-4 h-[60px] flex items-center justify-between">
                {/* Logo */}
                <Link to="/">
                    <motion.h1
                        className="text-xl font-bold tracking-tight cursor-pointer select-none"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <span className="bg-gradient-to-r from-papu-coral via-papu-violet to-papu-lavender bg-clip-text text-transparent">
                            Papu IG
                        </span>
                    </motion.h1>
                </Link>

                {/* Search */}
                <div className="hidden md:block relative w-[268px]">
                    <motion.div
                        animate={{ width: searchFocused ? 300 : 268 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar"
                                className="pl-9 h-9 bg-secondary/80 border-none rounded-lg text-sm focus-visible:ring-1 focus-visible:ring-papu-violet/30"
                                onFocus={() => {
                                    setSearchFocused(true);
                                    navigate('/search');
                                }}
                                onBlur={() => setSearchFocused(false)}
                            />
                        </div>
                    </motion.div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <Link to="/">
                        <NavIcon icon={Home} label="Inicio" />
                    </Link>
                    <Link to="/messages">
                        <NavIcon icon={MessageCircle} label="Mensajes" />
                    </Link>

                    <Link to="/create">
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-lg hover:bg-secondary hidden sm:flex"
                            >
                                <PlusSquare className="h-[22px] w-[22px]" />
                            </Button>
                        </motion.div>
                    </Link>

                    <Link to="/notifications">
                        <NavIcon icon={Heart} label="Notificaciones" />
                    </Link>

                    {/* Theme Toggle */}
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-lg hover:bg-secondary"
                            onClick={toggleTheme}
                        >
                            <AnimatePresence mode="wait">
                                {theme === 'dark' ? (
                                    <motion.div
                                        key="sun"
                                        initial={{ rotate: -90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: 90, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <Sun className="h-[18px] w-[18px]" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="moon"
                                        initial={{ rotate: 90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: -90, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <Moon className="h-[18px] w-[18px]" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Button>
                    </motion.div>

                    {/* Profile Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="ml-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-papu-violet/50"
                            >
                                <Avatar className="h-7 w-7 cursor-pointer border border-border">
                                    <AvatarImage src={userProfile?.avatarUrl} alt={userProfile?.username} />
                                    <AvatarFallback className="text-xs">{userProfile?.username?.[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </motion.button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 mt-2">
                            <Link to={`/profile/${userProfile?.username}`}>
                                <DropdownMenuItem className="cursor-pointer gap-2">
                                    <User className="h-4 w-4" />
                                    <span>Perfil</span>
                                </DropdownMenuItem>
                            </Link>
                            <Link to="/edit-profile">
                                <DropdownMenuItem className="cursor-pointer gap-2">
                                    <Settings className="h-4 w-4" />
                                    <span>Configuración</span>
                                </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer gap-2 text-destructive" onClick={handleLogout}>
                                <LogOut className="h-4 w-4" />
                                <span>Cerrar sesión</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </motion.nav>
    );
}

function NavIcon({ icon: Icon, label }) {
    return (
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex h-9 w-9 rounded-lg hover:bg-secondary"
                title={label}
            >
                <Icon className="h-[22px] w-[22px]" />
            </Button>
        </motion.div>
    );
}

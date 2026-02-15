import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, UserMinus, Search } from 'lucide-react';
import { doc, getDoc, db } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { useFollow } from '@/hooks/useFollow';

export default function FollowListModal({ title, uids, onClose }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            if (!uids || uids.length === 0) {
                setLoading(false);
                return;
            }

            try {
                const userPromises = uids.map(uid => getDoc(doc(db, 'users', uid)));
                const userDocs = await Promise.all(userPromises);
                const userData = userDocs
                    .filter(d => d.exists())
                    .map(d => ({ id: d.id, ...d.data() }));
                setUsers(userData);
            } catch (error) {
                console.error("Error fetching follow list users:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [uids]);

    const filteredUsers = users.filter(user =>
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-background w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[70vh] border border-border"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/10">
                    <span className="font-bold text-center flex-1 ml-6">{title}</span>
                    <button onClick={onClose} className="p-1 hover:bg-secondary rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-3 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-secondary/30 border-none rounded-lg focus-visible:ring-1 focus-visible:ring-papu-coral"
                        />
                    </div>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                    {loading ? (
                        <div className="py-20 flex justify-center">
                            <div className="animate-spin h-6 w-6 border-2 border-papu-coral rounded-full border-t-transparent" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground text-sm">
                            {searchQuery ? 'No se encontraron resultados' : 'No hay usuarios para mostrar'}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredUsers.map((user) => (
                                <UserListItem key={user.id} user={user} onClose={onClose} />
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

function UserListItem({ user, onClose }) {
    const { isFollowing, toggleFollow, loading: followLoading } = useFollow(user.id);

    return (
        <div className="flex items-center justify-between p-2 hover:bg-secondary/20 rounded-xl transition-colors group">
            <Link to={`/profile/${user.username}`} onClick={onClose} className="flex items-center gap-3 flex-1">
                <Avatar className="h-11 w-11 border border-border">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="text-sm font-bold flex items-center gap-1">
                        {user.username}
                        {user.isVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                        {user.displayName || user.username}
                    </span>
                </div>
            </Link>

            <Button
                size="sm"
                variant={isFollowing ? "secondary" : "default"}
                className={`h-8 font-bold px-4 text-xs rounded-lg transition-all ${!isFollowing && 'bg-papu-coral hover:bg-papu-coral/90'}`}
                onClick={toggleFollow}
                disabled={followLoading}
            >
                {isFollowing ? 'Siguiendo' : 'Seguir'}
            </Button>
        </div>
    );
}

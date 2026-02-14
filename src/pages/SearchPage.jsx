import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { collection, query, where, getDocs, db } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/useDebounce'; // We'll need this hook

export default function SearchPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    // Simple debounce implementation inside component for now
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.trim().length > 0) {
                setLoading(true);
                try {
                    // Firestore doesn't support native text search, so we'll do a simple prefix match on username
                    // Note: This is case-sensitive and limited. For production, Algolia is recommended.
                    const q = query(
                        collection(db, 'users'),
                        where('username', '>=', searchTerm.toLowerCase()),
                        where('username', '<=', searchTerm.toLowerCase() + '\uf8ff')
                    );

                    const querySnapshot = await getDocs(q);
                    const users = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setResults(users);
                } catch (error) {
                    console.error("Error searching users:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    return (
        <div className="max-w-md mx-auto p-4 md:py-8">
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 bg-secondary/50 border-none rounded-xl"
                    autoFocus
                />
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-papu-coral"></div>
                    </div>
                ) : results.length > 0 ? (
                    results.map((user) => (
                        <Link
                            key={user.id}
                            to={`/profile/${user.username}`}
                            className="flex items-center gap-3 p-2 hover:bg-secondary/50 rounded-lg transition-colors"
                        >
                            <Avatar className="h-12 w-12 border border-border">
                                <AvatarImage src={user.avatarUrl} />
                                <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-semibold text-sm">{user.username}</div>
                                <div className="text-muted-foreground text-xs">{user.displayName}</div>
                            </div>
                        </Link>
                    ))
                ) : searchTerm.trim().length > 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        No se encontraron usuarios
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground text-sm py-8">
                        Buscá usuarios por su nombre de usuario
                    </div>
                )}
            </div>
        </div>
    );
}

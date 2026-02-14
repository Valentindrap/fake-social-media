import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { collection, query, where, getDocs, db, orderBy, limit } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/useDebounce';
import PostGrid from '@/components/explore/PostGrid';

export default function SearchPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [explorePosts, setExplorePosts] = useState([]);
    const [loading, setLoading] = useState(false);

    // Initial load for Explore Grid
    useEffect(() => {
        const fetchExplorePosts = async () => {
            try {
                const q = query(
                    collection(db, 'posts'),
                    orderBy('createdAt', 'desc'),
                    limit(21) // 3x7 grid
                );
                const querySnapshot = await getDocs(q);
                const posts = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setExplorePosts(posts);
            } catch (error) {
                console.error("Error fetching explore posts:", error);
            }
        };

        fetchExplorePosts();
    }, []);

    // Helper for simple search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.trim().length > 0) {
                setLoading(true);
                try {
                    // Firestore doesn't support native text search, so we'll do a simple prefix match on username
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
        <div className="max-w-[935px] mx-auto p-0 md:p-4 md:py-8">
            <div className="sticky top-[60px] z-10 bg-background/95 backdrop-blur p-4 md:p-0 mb-4 md:mb-6">
                <div className="relative max-w-md mx-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-10 bg-secondary/50 border-none rounded-xl"
                    />
                </div>
            </div>

            <div className="pb-20 md:pb-0">
                {searchTerm.trim().length > 0 ? (
                    // Search Results
                    <div className="max-w-md mx-auto space-y-4 px-4 md:px-0">
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
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                No se encontraron usuarios
                            </div>
                        )}
                    </div>
                ) : (
                    // Explore Grid
                    <PostGrid posts={explorePosts} />
                )}
            </div>
        </div>
    );
}

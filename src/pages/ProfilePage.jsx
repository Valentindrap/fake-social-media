import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Settings, Grid, Bookmark, Users, MoreHorizontal } from 'lucide-react';
import { collection, query, where, getDocs, db, doc, getDoc } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useFollow } from '@/hooks/useFollow';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function ProfilePage() {
    const { username } = useParams();
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const { isFollowing, toggleFollow } = useFollow(profile?.id);

    const isOwnProfile = currentUser && userProfile?.username === username;

    useEffect(() => {
        async function fetchProfile() {
            try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('username', '==', username));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0];
                    const userData = { id: userDoc.id, ...userDoc.data() };
                    setProfile(userData);

                    // Fetch posts
                    const postsRef = collection(db, 'posts');
                    const postsQ = query(postsRef, where('userId', '==', userDoc.id));
                    const postsSnapshot = await getDocs(postsQ);
                    const userPosts = postsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setPosts(userPosts);
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        }

        if (username) {
            fetchProfile();
        }
    }, [username]);

    const handleFollow = async () => {
        await toggleFollow();
        // Optimistic UI update logic is handled via real-time update in AuthContext?
        // No, AuthContext updates MY following list.
        // But PROFILE's follower count won't update automatically unless we listen to profile doc.
        // For simplicity, we can manually increment logic here or switch ProfilePage to listen to local doc.
        // Let's do simple local update:
        setProfile(prev => ({
            ...prev,
            followers: prev.followers + (isFollowing ? -1 : 1)
        }));
    };

    const handleMessage = () => {
        if (!profile) return;
        navigate(`/messages?userId=${profile.id}`);
    };

    if (loading) return (
        <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-papu-coral"></div>
        </div>
    );

    if (!profile) return <div className="text-center p-8">Usuario no encontrado</div>;

    return (
        <div className="max-w-[935px] mx-auto px-4 py-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-12">
                <div className="mx-auto md:mx-0 w-[77px] h-[77px] md:w-[150px] md:h-[150px] flex-shrink-0">
                    <Avatar className="w-full h-full border border-border">
                        <AvatarImage src={profile.avatarUrl} className="object-cover" />
                        <AvatarFallback>{profile.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                </div>

                <section className="flex-1 min-w-0 w-full">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                        <h2 className="text-xl md:text-2xl font-normal truncate text-center md:text-left">{profile.username}</h2>
                        {isOwnProfile ? (
                            <div className="flex gap-2 justify-center md:justify-start">
                                <Link to="/edit-profile">
                                    <Button variant="secondary" size="sm" className="font-semibold h-8 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700">Editar perfil</Button>
                                </Link>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Settings className="h-5 w-5" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex gap-2 justify-center md:justify-start">
                                <Button
                                    className={`font-semibold h-8 px-6 transition-all ${isFollowing
                                            ? 'bg-zinc-200 dark:bg-zinc-800 text-foreground hover:bg-zinc-300 dark:hover:bg-zinc-700'
                                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                                        }`}
                                    onClick={handleFollow}
                                >
                                    {isFollowing ? 'Siguiendo' : 'Seguir'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="font-semibold h-8 px-6 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                                    onClick={handleMessage}
                                >
                                    Enviar mensaje
                                </Button>
                                <Button variant="secondary" size="icon" className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center md:justify-start gap-8 mb-4 text-sm md:text-base">
                        <span><span className="font-semibold">{posts.length}</span> publicaciones</span>
                        <span><span className="font-semibold">{profile.followers || 0}</span> seguidores</span>
                        <span><span className="font-semibold">{profile.following || 0}</span> seguidos</span>
                    </div>

                    <div className="text-sm hidden md:block">
                        <span className="font-semibold block">{profile.displayName}</span>
                        <p className="whitespace-pre-wrap">{profile.bio}</p>
                    </div>
                    {/* Mobile Bio */}
                    <div className="text-sm md:hidden px-2 mb-4">
                        <span className="font-semibold block">{profile.displayName}</span>
                        <p className="whitespace-pre-wrap">{profile.bio}</p>
                    </div>
                </section>
            </header>

            {/* Tabs */}
            <div className="border-t border-border flex justify-center gap-12 text-xs font-semibold tracking-widest text-muted-foreground mb-4">
                <button className="flex items-center gap-1.5 h-[52px] border-t-2 border-foreground text-foreground -mt-[1px]">
                    <Grid className="h-3 w-3" /> PUBLICACIONES
                </button>
                <button className="flex items-center gap-1.5 h-[52px] border-t-2 border-transparent hover:text-foreground -mt-[1px] transition-colors">
                    <Bookmark className="h-3 w-3" /> GUARDADO
                </button>
                <button className="flex items-center gap-1.5 h-[52px] border-t-2 border-transparent hover:text-foreground -mt-[1px] transition-colors">
                    <Users className="h-3 w-3" /> ETIQUETAS
                </button>
            </div>

            {/* Grid */}
            {posts.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 md:gap-7">
                    {posts.map((post) => (
                        <div key={post.id} className="relative aspect-square group cursor-pointer bg-secondary">
                            <img src={post.image} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex gap-6 text-white font-bold">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">❤ {post.likes}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-12 text-center text-muted-foreground">
                    <div className="border-2 border-dashed border-border rounded-xl p-8 max-w-sm mx-auto">
                        <div className="mx-auto w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                            <Grid className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold mb-1">Aún no hay publicaciones</h3>
                        <p className="text-xs">Cuando compartas fotos, aparecerán en tu perfil.</p>
                    </div>
                </div>
            )}
        </div>
    );
}

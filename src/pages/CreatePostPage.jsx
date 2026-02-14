import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { compressImage } from '@/lib/imageUtils';
import { db, collection, addDoc, serverTimestamp } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function CreatePostPage() {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();

    const [image, setImage] = useState(null);
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    const handleFile = async (file) => {
        if (file && file.type.startsWith('image/')) {
            try {
                const compressed = await compressImage(file);
                setImage(compressed);
                setError('');
            } catch (error) {
                console.error("Error compressing image:", error);
                setError("Error al procesar la imagen");
            }
        } else {
            setError("Por favor seleccioná una imagen válida");
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else {
            setDragActive(false);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer?.files?.[0];
        await handleFile(file);
    };

    const handleSubmit = async () => {
        if (!image || !currentUser) return;
        setLoading(true);
        setError('');

        try {
            // Ensure userProfile is loaded
            if (!userProfile) {
                throw new Error("Perfil de usuario no cargado. Intentá recargar la página.");
            }

            await addDoc(collection(db, 'posts'), {
                userId: currentUser.uid,
                user: {
                    username: userProfile.username || 'usuario',
                    avatar: userProfile.avatarUrl || '',
                },
                image: image,
                caption: caption,
                likes: 0,
                comments: [],
                createdAt: serverTimestamp(),
            });
            navigate('/');
        } catch (error) {
            console.error("Error creating post:", error);
            setError("Error al crear la publicación: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-lg mx-auto p-4 min-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-lg font-semibold">Nueva publicación</h1>
                <Button
                    onClick={handleSubmit}
                    disabled={!image || loading}
                    className="text-papu-coral hover:text-papu-coral/80 font-semibold"
                    variant="ghost"
                >
                    {loading ? 'Publicando...' : 'Compartir'}
                </Button>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4 text-sm font-medium">
                    {error}
                </div>
            )}

            <div className="flex-1 flex flex-col gap-6">
                {!image ? (
                    <motion.div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
              flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors min-h-[300px]
              ${dragActive ? 'border-papu-coral bg-papu-coral/5' : 'border-border hover:bg-secondary/20'}
            `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFile(e.target.files?.[0])}
                        />
                        <div className="bg-secondary rounded-full p-4">
                            <ImagePlus className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">
                            Toca para seleccionar una foto
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        <div className="relative aspect-square bg-secondary rounded-xl overflow-hidden shadow-sm">
                            <img src={image} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                onClick={() => setImage(null)}
                                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                                disabled={loading}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary">
                                {userProfile?.avatarUrl && (
                                    <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                )}
                            </div>
                            <Textarea
                                placeholder="Escribí una descripción..."
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                className="min-h-[100px] resize-none border-none focus-visible:ring-0 p-0 text-base"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

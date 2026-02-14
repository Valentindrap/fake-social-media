import { useState } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function CreatePostDialog({ open, onOpenChange }) {
    const [caption, setCaption] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [preview, setPreview] = useState(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleClose = () => {
        setCaption('');
        setPreview(null);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-4 py-3 border-b border-border/60">
                    <DialogTitle className="text-center text-[15px] font-semibold">
                        Crear publicación
                    </DialogTitle>
                </DialogHeader>

                <div className="p-4">
                    {!preview ? (
                        <motion.div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            animate={{
                                borderColor: dragActive ? '#FF6B6B' : 'var(--border)',
                                background: dragActive
                                    ? 'rgba(255, 107, 107, 0.05)'
                                    : 'transparent',
                            }}
                            className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center py-16 gap-4 transition-colors"
                        >
                            <motion.div
                                animate={{ y: dragActive ? -5 : 0 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                            >
                                <ImagePlus className="h-12 w-12 text-muted-foreground/50" strokeWidth={1.2} />
                            </motion.div>
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">
                                    Arrastrá una foto o
                                </p>
                                <label className="cursor-pointer">
                                    <span className="text-sm font-semibold text-papu-coral hover:text-papu-coral/80 transition-colors">
                                        seleccioná desde tu dispositivo
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                </label>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="space-y-3">
                            <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary">
                                <motion.img
                                    src={preview}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                    initial={{ opacity: 0, scale: 1.05 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                />
                                <button
                                    onClick={() => setPreview(null)}
                                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                                >
                                    <X className="h-4 w-4 text-white" />
                                </button>
                            </div>

                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Escribí una descripción..."
                                rows={3}
                                className="w-full text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground/60 leading-relaxed"
                            />
                        </div>
                    )}
                </div>

                <div className="px-4 pb-4">
                    <Button
                        className="w-full bg-papu-coral hover:bg-papu-coral/90 text-white font-semibold rounded-xl h-10"
                        disabled={!preview}
                        onClick={handleClose}
                    >
                        Compartir
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

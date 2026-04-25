'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image, Video, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
    value?: string;
    mediaType?: 'image' | 'video';
    onChange: (url: string, type: 'image' | 'video') => void;
    onRemove: () => void;
}

export default function MediaUpload({ value, mediaType, onChange, onRemove }: Props) {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const preview = value ?? null;

    const handleFile = (file: File) => {
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');
        if (!isVideo && !isImage) return;

        const url = URL.createObjectURL(file);
        onChange(url, isVideo ? 'video' : 'image');
        if (inputRef.current) inputRef.current.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    if (preview) {
        return (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 group">
                {mediaType === 'video' ? (
                    <video src={preview} controls className="w-full max-h-64 object-contain bg-gray-50" />
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Question media" className="w-full max-h-64 object-contain bg-gray-50" />
                )}
                <button
                    onClick={() => {
                        if (inputRef.current) inputRef.current.value = '';
                        onRemove();
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                isDragging ? 'border-[#4b3fe9] bg-[#4b3fe9]/4' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
            )}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
        >
            <div className="flex flex-col items-center gap-2">
                <div className="flex gap-2">
                    <Image className="w-5 h-5 text-gray-300" />
                    <Video className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500 font-medium">Drop image or video here</p>
                <p className="text-xs text-gray-400">PNG, JPG, MP4 up to 50MB</p>
                <Button type="button" variant="outline" size="sm" className="mt-1 rounded-lg text-xs font-semibold bg-amber-200">
                    Browse files
                </Button>
            </div>
            <input
                ref={inputRef} type="file" className="hidden"
                accept="image/*,video/*"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
        </div>
    );
}

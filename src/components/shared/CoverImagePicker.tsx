'use client';

import { useState, useRef } from 'react';
import { Search, Upload, Loader2, Link as LinkIcon } from 'lucide-react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

/* ─── Presets (Unsplash CDN, no API key) ─────────────────────────────────── */

const PRESETS = [
    { url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80', label: 'Books' },
    { url: 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=500&q=80', label: 'Maths' },
    { url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&q=80', label: 'Desk' },
    { url: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=500&q=80', label: 'Writing' },
    { url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=500&q=80', label: 'Classroom' },
    { url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=500&q=80', label: 'Campus' },
    { url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&q=80', label: 'Code' },
    { url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&q=80', label: 'Science' },
    { url: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=500&q=80', label: 'Tech' },
    { url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9213?w=500&q=80', label: 'Dev' },
    { url: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=500&q=80', label: 'Formula' },
    { url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500&q=80', label: 'Read' },
];

type Tab = 'presets' | 'search' | 'upload' | 'url';

type Props = {
    open: boolean;
    onClose: () => void;
    /** Called with the final public URL once the user confirms */
    onSelect: (url: string) => void;
    /** Supabase Storage bucket to upload files into */
    bucket?: string;
    /** Current user ID (used as path prefix in storage) */
    userId?: string | null;
    title?: string;
};

export function CoverImagePicker({
    open, onClose, onSelect, bucket = 'exam-covers', userId, title = 'Choose Cover Image',
}: Props) {
    const [tab,           setTab]           = useState<Tab>('presets');
    const [searchQuery,   setSearchQuery]   = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [searching,     setSearching]     = useState(false);
    const [uploading,     setUploading]     = useState(false);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [uploadUrl,     setUploadUrl]     = useState<string | null>(null);
    const [customUrl,     setCustomUrl]     = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    /* ── Unsplash API v3 search ── */
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        setSearchResults([]);
        try {
            const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
            const res = await fetch(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery.trim())}&per_page=9&client_id=${key}`
            );
            const data = await res.json();
            const urls = (data.results as { urls: { regular: string } }[]).map(p => p.urls.regular);
            setSearchResults(urls);
        } catch {
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    /* ── File upload to Supabase Storage ─────────────────────────────────── */
    const handleFileChange = async (file: File) => {
        // Show local preview immediately
        const localUrl = URL.createObjectURL(file);
        setUploadPreview(localUrl);
        setUploadUrl(null);

        if (!userId) {
            // No userId — just use the blob URL (will be replaced on save if caller handles it)
            setUploadUrl(localUrl);
            return;
        }

        setUploading(true);
        const supabase = createClient();
        const ext  = file.name.split('.').pop() ?? 'jpg';
        const path = `${userId}/${Date.now()}.${ext}`;

        const { error } = await supabase.storage
            .from(bucket)
            .upload(path, file, { upsert: true, contentType: file.type });

        if (!error) {
            const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
            setUploadUrl(publicUrl);
        } else {
            // Fall back to blob URL
            setUploadUrl(localUrl);
        }
        setUploading(false);
    };

    const handleConfirmUpload = () => {
        if (uploadUrl) { onSelect(uploadUrl); onClose(); }
    };

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent
                className="z-200 max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden p-0 gap-0 rounded-2xl bg-white text-gray-900"
                overlayClassName="z-[150] bg-black/80"
                onInteractOutside={onClose}
            >
                    {/* Header */}
                    <DialogHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-gray-100 bg-white shrink-0 space-y-0">
                        <DialogTitle className="font-semibold text-gray-800 text-sm">{title}</DialogTitle>
                    </DialogHeader>

                    {/* Tabs */}
                    <div className="flex gap-1 px-5 pt-3 pb-1 bg-white shrink-0">
                        {(['presets', 'search', 'upload', 'url'] as Tab[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors capitalize',
                                    tab === t
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-gray-500 hover:bg-gray-100'
                                )}
                            >
                                {t === 'url' ? 'Paste URL' : t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 bg-white">

                        {/* ── Presets ── */}
                        {tab === 'presets' && (
                            <div className="grid grid-cols-3 gap-2">
                                {PRESETS.map(p => (
                                    <button
                                        key={p.url}
                                        onClick={() => { onSelect(p.url); onClose(); }}
                                        className="group relative aspect-video rounded-xl overflow-hidden border-2 border-transparent hover:border-indigo-400 transition-all"
                                        title={p.label}
                                    >
                                        <img src={p.url} alt={p.label} className="w-full h-full object-cover" loading="lazy" />
                                        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/50 to-transparent px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-[10px] font-semibold text-white">{p.label}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ── Search (Unsplash Source) ── */}
                        {tab === 'search' && (
                            <div>
                                <div className="flex gap-2 mb-4">
                                    <Input
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search (e.g. mathematics, biology…)"
                                        className="h-9 text-sm"
                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    />
                                    <Button
                                        size="sm"
                                        className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white px-3 shrink-0"
                                        onClick={handleSearch}
                                        disabled={searching || !searchQuery.trim()}
                                    >
                                        {searching
                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            : <Search className="w-3.5 h-3.5" />}
                                    </Button>
                                </div>

                                {searching && (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                    </div>
                                )}

                                {!searching && searchResults.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {searchResults.map((url, i) => (
                                            <button
                                                key={i}
                                                onClick={() => { onSelect(url); onClose(); }}
                                                className="aspect-video rounded-xl overflow-hidden border-2 border-transparent hover:border-indigo-400 transition-all"
                                            >
                                                <img src={url} alt="result" className="w-full h-full object-cover" loading="lazy" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {!searching && searchResults.length === 0 && (
                                    <p className="text-xs text-gray-400 text-center py-8">
                                        Enter a keyword and click Search
                                    </p>
                                )}
                            </div>
                        )}

                        {/* ── Upload ── */}
                        {tab === 'upload' && (
                            <div className="flex flex-col items-center gap-4">
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    className="hidden"
                                    onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) handleFileChange(f);
                                        e.target.value = '';
                                    }}
                                />

                                {uploadPreview ? (
                                    <div className="w-full">
                                        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200 mb-3">
                                            <img src={uploadPreview} alt="preview" className="w-full h-full object-cover" />
                                            {uploading && (
                                                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 text-xs h-9"
                                                onClick={() => {
                                                    setUploadPreview(null);
                                                    setUploadUrl(null);
                                                    fileRef.current?.click();
                                                }}
                                            >
                                                Change
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9"
                                                onClick={handleConfirmUpload}
                                                disabled={uploading || !uploadUrl}
                                            >
                                                {uploading
                                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Uploading…</>
                                                    : 'Use This Image'}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fileRef.current?.click()}
                                        className="w-full border-2 border-dashed border-gray-200 rounded-xl
                                                   flex flex-col items-center justify-center gap-3 py-12
                                                   hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                            <Upload className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-gray-600 group-hover:text-indigo-600 transition-colors">Click to upload</p>
                                            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP — max 5 MB</p>
                                        </div>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* ── Paste URL ── */}
                        {tab === 'url' && (
                            <div className="flex flex-col gap-4">
                                {customUrl && (
                                    <div className="w-full aspect-video rounded-xl overflow-hidden border border-gray-200">
                                        <img
                                            src={customUrl}
                                            alt="preview"
                                            className="w-full h-full object-cover"
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <Input
                                            value={customUrl}
                                            onChange={e => setCustomUrl(e.target.value)}
                                            placeholder="https://example.com/image.jpg"
                                            className="h-9 text-sm pl-8"
                                        />
                                    </div>
                                    <Button
                                        size="sm"
                                        className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 shrink-0"
                                        disabled={!customUrl.trim()}
                                        onClick={() => {
                                            onSelect(customUrl.trim());
                                            onClose();
                                            setCustomUrl('');
                                        }}
                                    >
                                        Apply
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
            </DialogContent>
        </Dialog>
    );
}

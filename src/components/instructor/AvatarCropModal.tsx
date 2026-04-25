'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Check, Loader2 } from 'lucide-react';
import Cropper from 'react-easy-crop';

interface AvatarCropModalProps {
    isOpen: boolean;
    imageSrc: string;
    onClose: () => void;
    onCropComplete: (croppedImage: Blob) => void;
    isLoading?: boolean;
}

export default function AvatarCropModal({
    isOpen,
    imageSrc,
    onClose,
    onCropComplete,
    isLoading = false,
}: AvatarCropModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropAreaChange = useCallback((croppedArea: any, croppedAreaPixels: { x: number; y: number; width: number; height: number }) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const generateCroppedImage = useCallback(async () => {
        if (!croppedAreaPixels) return;

        setIsProcessing(true);

        try {
            const image = new Image();
            image.src = imageSrc;

            await new Promise((resolve) => {
                image.onload = resolve;
            });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const { width, height } = croppedAreaPixels;
            const size = Math.min(width, height);

            canvas.width = 300;
            canvas.height = 300;

            const sourceX = croppedAreaPixels.x;
            const sourceY = croppedAreaPixels.y;

            ctx?.drawImage(
                image,
                sourceX,
                sourceY,
                size,
                size,
                0,
                0,
                300,
                300
            );

            canvas.toBlob((blob) => {
                if (blob) {
                    onCropComplete(blob);
                    handleClose();
                }
                setIsProcessing(false);
            }, 'image/jpeg', 0.9);
        } catch (error) {
            console.error('Error cropping image:', error);
            setIsProcessing(false);
        }
    }, [croppedAreaPixels, imageSrc, onCropComplete]);

    const handleClose = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-linear-to-r from-indigo-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">Crop your photo</h2>
                            <button
                                onClick={handleClose}
                                className="text-white/80 hover:text-white transition-colors p-1"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="space-y-4 p-6">
                            {/* Crop area */}
                            <div className="relative w-full bg-gray-100 rounded-xl overflow-hidden" style={{ height: '320px' }}>
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={true}
                                    onCropChange={setCrop}
                                    onCropAreaChange={onCropAreaChange}
                                    onZoomChange={setZoom}
                                />
                            </div>

                            {/* Controls */}
                            <div className="space-y-3">
                                {/* Zoom slider */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Zoom</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="3"
                                        step="0.1"
                                        value={zoom}
                                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>

                                {/* Reset button */}
                                <button
                                    onClick={() => {
                                        setCrop({ x: 0, y: 0 });
                                        setZoom(1);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Reset
                                </button>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={generateCroppedImage}
                                    disabled={isProcessing || isLoading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                                >
                                    {isProcessing || isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Processing
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Apply
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

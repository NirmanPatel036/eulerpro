'use client';

import { motion } from 'framer-motion';
import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title = 'Coming Soon' }: { title?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center"
        >
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                <Construction className="w-6 h-6 text-violet-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">{title}</h1>
            <p className="text-sm text-gray-400 max-w-xs">
                This page is under construction. Check back soon!
            </p>
        </motion.div>
    );
}

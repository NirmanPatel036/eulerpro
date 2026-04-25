'use client';

import 'katex/dist/katex.min.css';
import katex from 'katex';
import { useMemo } from 'react';

interface Props {
    text: string;
    className?: string;
    displayMode?: boolean;
}

export default function MathText({ text, className, displayMode }: Props) {
    const segments = useMemo(() => {
        if (!text) return [];

        // Regex to find $$...$$ or $...$
        // This regex handles display math ($$) and inline math ($)
        // Group 1: display math contents
        // Group 2: inline math contents
        const regex = /\$\$(.*?)\$\$|\$(.*?)\$/g;
        const result = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            // Text before the match
            if (match.index > lastIndex) {
                result.push({
                    type: 'text',
                    content: text.slice(lastIndex, match.index),
                });
            }

            if (match[1]) {
                // Display math $$...$$
                result.push({
                    type: 'math',
                    content: match[1],
                    display: true,
                });
            } else if (match[2]) {
                // Inline math $...$
                result.push({
                    type: 'math',
                    content: match[2],
                    display: false,
                });
            }

            lastIndex = regex.lastIndex;
        }

        // Remaining text
        if (lastIndex < text.length) {
            result.push({
                type: 'text',
                content: text.slice(lastIndex),
            });
        }

        return result;
    }, [text]);

    if (!text) return null;

    return (
        <span className={className}>
            {segments.map((seg, i) => {
                if (seg.type === 'math') {
                    try {
                        const html = katex.renderToString(seg.content, {
                            displayMode: seg.display || displayMode,
                            throwOnError: false,
                        });
                        return (
                            <span
                                key={i}
                                dangerouslySetInnerHTML={{ __html: html }}
                                className={seg.display ? 'block my-2 text-center' : 'inline-block px-0.5'}
                            />
                        );
                    } catch (err) {
                        console.error('KaTeX error:', err);
                        return <span key={i} className="text-red-500 underline decoration-dotted">{seg.display ? `$$${seg.content}$$` : `$${seg.content}$`}</span>;
                    }
                }
                return <span key={i}>{seg.content}</span>;
            })}
        </span>
    );
}

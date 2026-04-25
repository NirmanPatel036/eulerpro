import { NextRequest, NextResponse } from 'next/server';
import { Question, QuestionType } from '@/lib/types';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/* ─── sanitisation ─────────────────────────────────────────────────────────── */

/** Decode HTML entities, strip HTML tags and common markdown formatting. */
function sanitizeText(raw: unknown): string {
    if (typeof raw !== 'string') return String(raw ?? '');
    return raw
        // decode named HTML entities
        .replace(/&amp;/gi,        '&')
        .replace(/&lt;/gi,         '<')
        .replace(/&gt;/gi,         '>')
        .replace(/&quot;/gi,       '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&nbsp;/gi,       ' ')
        // decode numeric HTML entities (decimal and hex)
        .replace(/&#(\d+);/g,       (_, n) => String.fromCharCode(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
        // strip any residual HTML tags
        .replace(/<[^>]+>/g, '')
        // strip markdown bold / italic / inline-code
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g,     '$1')
        .replace(/__([^_]+)__/g,     '$1')
        .replace(/_([^_]+)_/g,       '$1')
        .replace(/`([^`]+)`/g,       '$1')
        // collapse extra whitespace
        .replace(/[ \t]+/g, ' ')
        .trim();
}

/** Recursively sanitize all displayable text fields on a question object. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeQuestion(q: any): any {
    if (!q || typeof q !== 'object') return q;
    const s = { ...q };
    if (typeof s.text          === 'string') s.text          = sanitizeText(s.text);
    if (typeof s.sample_answer === 'string') s.sample_answer = sanitizeText(s.sample_answer);
    // answer_regex: strip tags only — don't alter the regex pattern itself
    if (typeof s.answer_regex  === 'string') s.answer_regex  = s.answer_regex.replace(/<[^>]+>/g, '').trim();
    if (Array.isArray(s.options)) s.options = s.options.map(sanitizeText);
    if (Array.isArray(s.items))   s.items   = s.items.map(sanitizeText);
    if (Array.isArray(s.pairs))   s.pairs   = s.pairs.map(
        (p: { left: unknown; right: unknown }) => ({ left: sanitizeText(p.left), right: sanitizeText(p.right) }),
    );
    return s;
}

/* ─── system prompt ────────────────────────────────────────────────────────── */
function buildPrompt(prompt: string, count: number, difficulty: string, types: QuestionType[]) {
    const typeDescriptions: Record<QuestionType, string> = {
        multiple_choice: `{ "type": "multiple_choice", "text": "...", "options": ["A","B","C","D"], "correct_option": 0, "points": 2, "difficulty": "medium", "partial_credit": false, "negative_marking": false }`,
        checkbox:        `{ "type": "checkbox", "text": "...", "options": ["A","B","C","D"], "correct_options": [0,2], "points": 3, "difficulty": "medium", "partial_credit": true, "negative_marking": false }`,
        true_false:      `{ "type": "true_false", "text": "...", "correct_answer": true, "points": 1, "difficulty": "easy", "partial_credit": false, "negative_marking": false }`,
        fill_blank:      `{ "type": "fill_blank", "text": "The ___ is the powerhouse of the cell.", "answer_regex": "mitochondria", "sample_answer": "mitochondria", "points": 2, "difficulty": "medium", "partial_credit": false, "negative_marking": false }`,
        matching:        `{ "type": "matching", "text": "Match each term to its definition.", "pairs": [{"left":"Term A","right":"Def A"},{"left":"Term B","right":"Def B"}], "points": 4, "difficulty": "medium", "partial_credit": true, "negative_marking": false }`,
        reorder:         `{ "type": "reorder", "text": "Arrange these steps in the correct order.", "items": ["Step C","Step A","Step B"], "correct_order": [1,2,0], "points": 3, "difficulty": "medium", "partial_credit": true, "negative_marking": false }`,
    };

    const examples = types.map(t => typeDescriptions[t]).join(',\n');
    const diffNote  = difficulty === 'mixed'
        ? 'Vary the difficulty across easy, medium, and hard.'
        : `All questions should be ${difficulty} difficulty.`;

    return `You are an expert educator and exam designer. Generate exactly ${count} exam questions about the following topic.

TOPIC / INSTRUCTIONS:
${prompt}

REQUIREMENTS:
- Use ONLY these question types: ${types.join(', ')}
- ${diffNote}
- Write clear, unambiguous questions appropriate for a university exam.
- IMPORTANT: For any mathematical formulas, scientific notations, or complex equations, use LaTeX notation.
- Use single dollar signs for inline math (e.g., $E=mc^2$) and double dollar signs for display math (e.g., $$\\int_0^\\infty e^{-x^2} dx$$).
- Each question must include all required fields for its type.
- points should reflect difficulty: easy=1, medium=2, hard=3 (or higher for multi-part types).

Return ONLY a valid JSON array — no markdown fences, no explanation, no extra text. The array must contain exactly ${count} objects matching the schemas below:

[
${examples}
]`;
}

/* ─── route handler ─────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    /* parse form data */
    let prompt    = '';
    let count     = 5;
    let difficulty = 'mixed';
    let types: QuestionType[] = ['multiple_choice', 'true_false'];
    let fileBase64: string | null = null;
    let fileMime:   string | null = null;

    try {
        const form = await req.formData();
        prompt     = (form.get('prompt') as string) || '';
        count      = Math.min(50, Math.max(1, parseInt(form.get('count') as string) || 5));
        difficulty = (form.get('difficulty') as string) || 'mixed';
        const rawTypes = form.get('types') as string;
        if (rawTypes) types = JSON.parse(rawTypes) as QuestionType[];

        const file = form.get('file') as File | null;
        if (file && file.size > 0) {
            const buf    = await file.arrayBuffer();
            fileBase64   = Buffer.from(buf).toString('base64');
            fileMime     = file.type || 'application/octet-stream';
        }
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!prompt.trim()) {
        return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    /* build Gemini request */
    const textPart = { text: buildPrompt(prompt, count, difficulty, types) };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [textPart];
    if (fileBase64 && fileMime) {
        parts.unshift({ inline_data: { mime_type: fileMime, data: fileBase64 } });
    }

    const geminiBody = {
        contents: [{ role: 'user', parts }],
        generationConfig: {
            temperature:    0.7,
            topP:           0.95,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
        },
    };

    try {
        const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(geminiBody),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('Gemini API error:', err);
            return NextResponse.json({ error: 'Gemini API error', details: err }, { status: 502 });
        }

        const data = await res.json();
        const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

        /* parse JSON — Gemini sometimes wraps in fences despite responseMimeType */
        let questions: Question[] = [];
        try {
            const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            questions = JSON.parse(cleaned);
        } catch {
            console.error('Failed to parse Gemini response:', raw);
            return NextResponse.json({ error: 'Failed to parse generated questions', raw }, { status: 502 });
        }

        /* sanitize text fields, strip id so the client assigns a fresh uuid */
        const stamped = questions.map((q, i) => ({ ...sanitizeQuestion(q), id: undefined, order: i }));
        return NextResponse.json({ questions: stamped });

    } catch (err) {
        console.error('Generate exam error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

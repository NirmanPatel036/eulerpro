import { NextRequest, NextResponse } from 'next/server';
import ApileagueJs from 'apileague-js';

// Configure once at module scope — server-side only, never sent to the browser
const _apiKey = process.env.MEME_API_KEY ?? process.env.NEXT_PUBLIC_MEME_KEY ?? '';
const _client = ApileagueJs.ApiClient.instance;
_client.authentications['apiKey'].apiKey = _apiKey;
_client.authentications['headerApiKey'].apiKey = _apiKey;

const _humor = new ApileagueJs.HumorApi();

function searchMemes(opts: {
    keywords?: string;
    number?: number;
}): Promise<{ memes: { url: string; type: string; description: string }[]; available: number }> {
    return new Promise((resolve, reject) => {
        _humor.searchMemesAPI(opts, (error, data) => {
            if (error) reject(new Error(error));
            else resolve(data);
        });
    });
}

export async function GET(req: NextRequest) {
    console.log('[meme route] MEME_API_KEY set:', !!_apiKey);

    if (!_apiKey) {
        console.error('[meme route] No API key found in env (MEME_API_KEY / NEXT_PUBLIC_MEME_KEY)');
        return NextResponse.json({ error: 'Missing MEME_API_KEY' }, { status: 500 });
    }

    const { searchParams } = req.nextUrl;
    const keywords = searchParams.get('keywords') ?? 'funny';
    const number   = Math.min(10, parseInt(searchParams.get('number') ?? '5', 10));

    console.log('[meme route] calling searchMemesAPI →', { keywords, number });

    try {
        const data = await searchMemes({ keywords, number });
        console.log('[meme route] response — available:', data.available, '| memes returned:', data.memes?.length ?? 0);
        if (data.memes?.length) {
            console.log('[meme route] first meme:', JSON.stringify(data.memes[0]));
        }
        return NextResponse.json(data, {
            headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate' },
        });
    } catch (err) {
        console.error('[meme route] apileague error:', err);
        return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    }
}

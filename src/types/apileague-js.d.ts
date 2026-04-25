// Minimal ambient types for the CJS apileague-js package (no bundled declarations)
declare module 'apileague-js' {
    class ApiClient {
        static instance: ApiClient;
        authentications: Record<string, { apiKey: string }>;
    }

    interface SearchMemesOpts {
        keywords?: string;
        keywordsInImage?: boolean;
        mediaType?: string;
        minRating?: number;
        maxAgeDays?: number;
        offset?: number;
        number?: number;
    }

    interface MemeItem {
        url: string;
        type: string;
        description: string;
    }

    interface SearchMemesResult {
        memes: MemeItem[];
        available: number;
    }

    type SearchMemesCallback = (error: string | null, data: SearchMemesResult, response: unknown) => void;

    class HumorApi {
        searchMemesAPI(opts: SearchMemesOpts, callback: SearchMemesCallback): void;
        randomMemeAPI(callback: SearchMemesCallback): void;
    }

    const _default: {
        ApiClient: typeof ApiClient;
        HumorApi: typeof HumorApi;
    };
    export default _default;
}

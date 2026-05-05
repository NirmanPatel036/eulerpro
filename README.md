# Frontend Setup

Next.js frontend for the online proctoring app.

## Requirements

- Node.js 20+
- npm

## Install

```bash
cd frontend
npm install --legacy peer deps
```

## Environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Optional, used by some app features
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=
NEXT_PUBLIC_MEME_KEY=
GEMINI_API_KEY=
MEME_API_KEY=
```

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Useful Commands

```bash
npm run lint
npm run build
npm run start
```

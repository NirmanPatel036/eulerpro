import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'EulerPro — Online Exam & Proctoring Platform',
  description: 'Create exams, proctor students, and get smart results instantly.',
  keywords: ['exam', 'proctoring', 'assessment', 'education', 'online test'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* DM Sans Variable — body */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..900;1,9..40,300..900&display=swap"
          rel="stylesheet"
        />
        {/* Geist Mono — headings / accent */}
        <link
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-[#0a0a0f]">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const ibmPlexSans = IBM_Plex_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'TemplaFill | Document Field Extraction & Template Population',
  description:
    'Extract structured fields from source PDF documents and populate DOCX, XLSX, and PPTX templates using RAG and Gemini.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">{children}</body>
    </html>
  );
}

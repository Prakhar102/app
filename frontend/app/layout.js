import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import SessionProviderWrapper from '@/components/SessionProviderWrapper';
import { LanguageProvider } from '@/context/LanguageContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Smart Khaad Manager - Fertilizer Shop POS',
  description: 'Complete POS system for fertilizer shops with AI Voice assistance',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProviderWrapper>
          <LanguageProvider>
            {children}
            <Toaster position="top-center" richColors />
          </LanguageProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}

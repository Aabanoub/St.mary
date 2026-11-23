import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { SiteLockProvider } from '@/context/SiteLockContext';
import { InstallPromptModal } from '@/components/pwa/InstallPromptModal';

export const metadata: Metadata = {
  title: 'كنيسة السيدة العذراء مريم - إعداد خدام',
  description: 'تطبيق إدارة الحضور والمتابعة الروحية وإعداد الخدام بكنيسة السيدة العذراء مريم',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'إعداد خدام',
  },
};

export const viewport: Viewport = {
  themeColor: '#68432b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#fbf8f5] dark:bg-[#18120e] text-[#22140c] dark:text-[#f5eee7] antialiased selection:bg-brown-200 dark:selection:bg-brown-800">
        <ThemeProvider>
          <AuthProvider>
            <SiteLockProvider>
              {children}
              <InstallPromptModal />
            </SiteLockProvider>
          </AuthProvider>
        </ThemeProvider>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Package, Users, TrendingUp, Mic, FileText } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const translations = {
    loading: 'Loading...',
    posSystem: 'Complete POS & Management System for Fertilizer Shops',
    voiceAssistant: 'AI Voice Assistant',
    smartBilling: 'Smart Billing',
    fastBilling: 'Generate bills in seconds with local dialect support',
    inventory: 'Inventory Management',
    stockTracking: 'Real-time stock tracking and alerts',
    customerBalances: 'Customer Ledger',
    dueTracking: 'Track payments, dues (Udhaar) easily',
    dayBook: 'Day Book & Reports',
    staffManagement: 'Staff Management',
    manageStaffAccounts: 'Manage staff accounts and permissions',
    builtWith: 'Built for Indian Business',
  };
  const t = (key) => translations[key] || key;

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Smart Khad Manager
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            {t('posSystem')}
          </p>
          <p className="text-lg text-gray-500 mb-8">
            AI Voice Assistant | Inventory | Ledger | Reports
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signin">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                Login / साइन इन
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="lg" variant="outline">
                Signup / साइन अप
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Mic className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>{t('voiceAssistant')}</CardTitle>
              <CardDescription>
                बोलकर बिल बनाएं - "राजू को 10 यूरिया दिया 5000 में"
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>{t('smartBilling')}</CardTitle>
              <CardDescription>
                {t('fastBilling')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>{t('inventory')}</CardTitle>
              <CardDescription>
                {t('stockTracking')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle>{t('customerBalances')}</CardTitle>
              <CardDescription>
                {t('dueTracking')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle>{t('dayBook')}</CardTitle>
              <CardDescription>
                Daily reports with cash/online breakdown
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-teal-600" />
              </div>
              <CardTitle>{t('staffManagement')}</CardTitle>
              <CardDescription>
                {t('manageStaffAccounts')}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500 text-sm">
          <p>© 2025 Smart Khad Manager. {t('builtWith')}.</p>
        </div>
      </div>
    </div>
  );
}

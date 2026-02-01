'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, Package, AlertTriangle } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    todaySales: 0,
    totalDue: 0,
    lowStockCount: 0,
    totalProducts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('dashboard')}</h1>
          <p className="text-gray-600">{t('welcomeBack')}, {session?.user?.name}!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/reports" className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <Card className="cursor-pointer hover:border-green-600 transition-colors shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('todaySales')}</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {loading ? '...' : formatCurrency(stats.todaySales)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('salesSubtitle')}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dues" className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <Card className="cursor-pointer hover:border-orange-600 transition-colors shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('totalDue')}</CardTitle>
                <Users className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {loading ? '...' : formatCurrency(stats.totalDue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('dueSubtitle')}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/inventory?filter=low-stock" className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <Card className="cursor-pointer hover:border-red-600 transition-colors shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('lowStock')}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {loading ? '...' : stats.lowStockCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('stockSubtitle')}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/inventory" className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <Card className="cursor-pointer hover:border-blue-600 transition-colors shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('totalProducts')}</CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {loading ? '...' : stats.totalProducts}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('productSubtitle')}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('quickActions')}</CardTitle>
            <CardDescription>{t('commonTasks')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <a href="/billing" className="p-4 border rounded-lg hover:bg-green-50 hover:border-green-600 transition-colors">
                <h3 className="font-semibold text-green-600">{t('createBill')}</h3>
                <p className="text-sm text-gray-600 mt-1">{t('generateInvoice')}</p>
              </a>
              <a href="/inventory" className="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-600 transition-colors">
                <h3 className="font-semibold text-blue-600">{t('manageInventory')}</h3>
                <p className="text-sm text-gray-600 mt-1">{t('updateStock')}</p>
              </a>
              <a href="/customers" className="p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-600 transition-colors">
                <h3 className="font-semibold text-orange-600">{t('customerLedger')}</h3>
                <p className="text-sm text-gray-600 mt-1">{t('viewDues')}</p>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        {stats.lowStockCount > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {t('lowStockAlert')}
              </CardTitle>
              <CardDescription>
                {stats.lowStockCount} {t('restockSoon')}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

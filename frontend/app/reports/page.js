'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, Calendar, DollarSign } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function ReportsPage() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCash: 0,
    totalOnline: 0,
    totalExpenses: 0,
    totalPurchase: 0,
  });

  useEffect(() => {
    fetchTransactions();
  }, [dateRange]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const url = `/api/transactions?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions);
        calculateStats(data.transactions);
      }
    } catch (error) {
      toast.error(t('failedFetchTransactions'));
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (transactions) => {
    const stats = {
      totalSales: 0,
      totalCash: 0,
      totalOnline: 0,
      totalExpenses: 0,
      totalPurchase: 0,
    };

    transactions.forEach((txn) => {
      if (txn.type === 'SALE') {
        stats.totalSales += txn.totalAmount;
        if (txn.paymentMode === 'SPLIT' && txn.payments) {
          txn.payments.forEach(p => {
            if (p.mode === 'CASH') stats.totalCash += p.amount;
            else stats.totalOnline += p.amount;
          });
        } else {
          if (txn.paymentMode === 'CASH') {
            stats.totalCash += txn.paidAmount;
          } else {
            stats.totalOnline += txn.paidAmount;
          }
        }
      } else if (txn.type === 'EXPENSE') {
        stats.totalExpenses += txn.totalAmount;
      } else if (txn.type === 'PURCHASE') {
        stats.totalPurchase += txn.totalAmount;
      } else if (txn.type === 'PAYMENT') {
        if (txn.paymentMode === 'CASH') {
          stats.totalCash += txn.paidAmount;
        } else {
          stats.totalOnline += txn.paidAmount;
        }
      }
    });

    setStats(stats);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportToCSV = () => {
    const headers = [t('date'), t('type'), t('customer'), t('amount'), t('paid'), t('due'), t('paymentMode')];
    const rows = transactions.map((txn) => [
      formatDate(txn.date),
      txn.type,
      txn.customerName || '-',
      txn.totalAmount,
      txn.paidAmount,
      txn.dueAmount,
      txn.paidAmount === 0 ? t('fullCredit') : txn.paymentMode,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
    a.click();
    toast.success(t('reportExported'));
  };

  const isOwner = session?.user?.role === 'OWNER';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('reports')}</h1>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {t('dayBook')} / Roznamcha
            </CardTitle>
            <CardDescription>{t('selectDateRange')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('startDate')}</Label>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('endDate')}</Label>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={exportToCSV} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  {t('exportCsv')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('totalSales')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalSales)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('totalCash')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalCash)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('totalOnline')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalOnline)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('closingBalance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats.totalCash + stats.totalOnline - stats.totalExpenses)}
              </div>
            </CardContent>
          </Card>
        </div>

        {isOwner && stats.totalExpenses > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-semibold">{t('totalExpenses')}</p>
                  <p className="text-2xl font-bold text-orange-700">{formatCurrency(stats.totalExpenses)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('transactionHistory')}</CardTitle>
            <CardDescription>{transactions.length} {t('found')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-gray-500">{t('loading')}</p>
            ) : transactions.length === 0 ? (
              <p className="text-center py-8 text-gray-500">{t('noTransactions')}</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((txn) => (
                  <div key={txn._id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              txn.type === 'SALE'
                                ? 'default'
                                : txn.type === 'EXPENSE'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {txn.type}
                          </Badge>
                          <span className="font-semibold">{txn.customerName || t('walkIn')}</span>
                          {txn.type === 'SALE' ? (
                            txn.paidAmount === 0 ? (
                              <Badge variant="destructive" className="bg-red-600">{t('fullCredit')}</Badge>
                            ) : (
                              <Badge variant="outline" className={txn.dueAmount > 0 ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-green-50 text-green-700 border-green-200"}>
                                {txn.paymentMode}
                              </Badge>
                            )
                          ) : txn.paymentMode && (
                            <Badge variant="outline">{txn.paymentMode}</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                          <div>
                            <p className="text-gray-600">{t('date')}</p>
                            <p className="font-medium">{formatDate(txn.date)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">{t('total')}</p>
                            <p className="font-medium text-green-600">{formatCurrency(txn.totalAmount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">{t('paid')}</p>
                            <p className="font-medium">{formatCurrency(txn.paidAmount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">{t('due')}</p>
                            <p className="font-medium text-orange-600">{formatCurrency(txn.dueAmount)}</p>
                          </div>
                        </div>
                        {txn.description && (
                          <p className="text-sm text-gray-600 mt-2">{t('note')}: {txn.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

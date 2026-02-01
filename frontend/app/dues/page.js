'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, User, Phone, MapPin, Eye, ArrowLeft } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { IndianRupee } from 'lucide-react';
import PaymentCollectionModal from '@/components/PaymentCollectionModal';
import { useLanguage } from '@/context/LanguageContext';

export default function DuesPage() {
    const { t } = useLanguage();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [customerToCollect, setCustomerToCollect] = useState(null);

    useEffect(() => {
        fetchDues();
    }, []);

    const fetchDues = async () => {
        try {
            const response = await fetch('/api/dashboard/dues');
            const data = await response.json();
            if (data.success) {
                setCustomers(data.customers);
            }
        } catch (error) {
            console.error('Failed to fetch dues:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCollectPayment = (customer) => {
        setCustomerToCollect(customer);
        setIsPaymentModalOpen(true);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="outline" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('outstandingDues')}</h1>
                        <p className="text-gray-600">{t('duesSubtitle')}</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold flex items-center gap-2">
                            <User className="w-5 h-5 text-orange-600" />
                            {t('customerBalances')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                            </div>
                        ) : customers.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500">{t('noDues')}</p>
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow>
                                            <TableHead>{t('customerName')}</TableHead>
                                            <TableHead>{t('contact')}</TableHead>
                                            <TableHead>{t('location')}</TableHead>
                                            <TableHead className="text-right">{t('totalDue')}</TableHead>
                                            <TableHead className="text-center w-[200px]">{t('action')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {customers.map((customer) => (
                                            <TableRow key={customer._id} className="hover:bg-gray-50/50 transition-colors">
                                                <TableCell className="font-medium text-gray-900">
                                                    {customer.name}
                                                </TableCell>
                                                <TableCell className="text-gray-600">
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="w-3.5 h-3.5 opacity-60" />
                                                        {customer.mobile || 'N/A'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-gray-600">
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="w-3.5 h-3.5 opacity-60" />
                                                        {customer.address || 'N/A'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-red-600">
                                                    ₹{customer.totalDue.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Link href={`/customers?id=${customer._id}`}>
                                                            <Button variant="ghost" size="sm" className="h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 gap-1 rounded-xl">
                                                                <Eye className="w-4 h-4" />
                                                                {t('details')}
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <PaymentCollectionModal
                open={isPaymentModalOpen}
                onOpenChange={setIsPaymentModalOpen}
                customer={customerToCollect}
                onSuccess={fetchDues}
            />
        </DashboardLayout>
    );
}

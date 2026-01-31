'use client';
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Users, FileText, Loader2, Download, Building2, Phone, MapPin } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CustomersPage() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
  });

  // Transaction History State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerTransactions, setCustomerTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (error) {
      toast.error('Failed to fetch customers');
    }
  };

  const fetchShopConfig = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success) {
        return data.user.shopConfig;
      }
    } catch (error) {
      console.error('Failed to fetch shop settings');
    }
    return {};
  };

  const generatePDF = async (transaction) => {
    const shopConfig = await fetchShopConfig();
    const doc = new jsPDF({
      format: 'a5',
      unit: 'mm',
    });

    // Add shop logo if available
    if (shopConfig.logoUrl) {
      // doc.addImage(shopConfig.logoUrl, 'PNG', 10, 10, 30, 30);
    }

    // Shop details
    doc.setFontSize(16);
    doc.text(shopConfig.shopName || 'My Fertilizer Shop', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(shopConfig.address || '', 105, 22, { align: 'center' });
    if (shopConfig.gstNumber) {
      doc.text(`GST: ${shopConfig.gstNumber}`, 105, 28, { align: 'center' });
    }

    doc.setLineWidth(0.5);
    doc.line(10, 32, 138, 32);

    // Invoice details
    doc.setFontSize(12);
    doc.text('INVOICE', 105, 40, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Date: ${new Date(transaction.date).toLocaleDateString('en-IN')}`, 10, 46);
    doc.text(`Customer: ${transaction.customerName || 'Walk-in'}`, 10, 52);

    // Items table
    const tableData = transaction.items.map((item) => [
      item.itemName,
      item.qty.toString(),
      `₹${item.rate}`,
      `₹${item.amount}`,
    ]);

    doc.autoTable({
      startY: 58,
      head: [['Item', 'Qty', 'Rate', 'Amount']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [22, 163, 74] },
    });

    const finalY = doc.lastAutoTable.finalY + 5;

    // Totals
    doc.text(`Total: ₹${transaction.totalAmount}`, 138, finalY, { align: 'right' });
    doc.text(`Paid: ₹${transaction.paidAmount}`, 138, finalY + 6, { align: 'right' });
    doc.setFont(undefined, 'bold');
    doc.text(`Due: ₹${transaction.dueAmount}`, 138, finalY + 12, { align: 'right' });

    // Payment Info
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    const paymentInfoY = finalY + 20;
    doc.text(`Payment Mode: ${transaction.paymentMode}`, 10, paymentInfoY);
    if (transaction.paymentMode === 'ONLINE' && transaction.bankAccountId?.accountName) {
      doc.text(`Account: ${transaction.bankAccountId.accountName}`, 10, paymentInfoY + 5);
    }

    // Footer
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.text('Thank you for your business!', 105, 185, { align: 'center' });
    doc.text('_____________________', 105, 195, { align: 'center' });
    doc.text('Authorized Signature', 105, 200, { align: 'center' });

    // Download
    doc.save(`invoice_${transaction._id}.pdf`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Customer added!');
        fetchCustomers();
        setFormData({ name: '', mobile: '', address: '' });
        setShowForm(false);
      } else {
        toast.error(data.error || 'Failed to add customer');
      }
    } catch (error) {
      toast.error('Error adding customer');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerHistory = async (customer) => {
    setSelectedCustomer(customer);
    setIsHistoryOpen(true);
    setTransactionsLoading(true);
    try {
      const response = await fetch(`/api/transactions/customer/${customer._id}`);
      const data = await response.json();
      if (data.success) {
        setCustomerTransactions(data.transactions);
      }
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setTransactionsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('customers')}</h1>
        </div>

        {/* Add Form Removed */}

        {/* Customers List */}
        <div className="grid gap-4">
          {customers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No customers added yet</p>
              </CardContent>
            </Card>
          ) : (
            customers.map((customer) => (
              <Card key={customer._id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{customer.name}</h3>
                        {customer.totalDue > 0 && (
                          <Badge variant="destructive">Due: ₹{customer.totalDue}</Badge>
                        )}
                        {customer.totalDue === 0 && (
                          <Badge className="bg-green-600">Clear</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        {customer.mobile && (
                          <div>
                            <p className="text-sm text-gray-600">Mobile</p>
                            <p className="font-medium">{customer.mobile}</p>
                          </div>
                        )}
                        {customer.address && (
                          <div>
                            <p className="text-sm text-gray-600">Address</p>
                            <p className="font-medium">{customer.address}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button variant="outline" size="sm" onClick={() => loadCustomerHistory(customer)}>
                      <FileText className="w-4 h-4 mr-2" />
                      View Bills
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Transaction History Dialog */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-0">
            <div className="p-6 border-b bg-gray-50/50">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <FileText className="w-6 h-6 text-green-600" />
                  Billing History - {selectedCustomer?.name}
                </DialogTitle>
                <DialogDescription>
                  View and manage all bills for this customer
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-6">

              {transactionsLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                </div>
              ) : (
                <div className="mt-4">
                  {customerTransactions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No transaction history found</p>
                  ) : (
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="w-[100px]">Date</TableHead>
                          <TableHead className="min-w-[200px]">Items</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="w-[120px]">Payment Details</TableHead>
                          <TableHead className="text-right font-bold text-red-600 truncate">Pending Due</TableHead>
                          <TableHead className="text-right w-[80px]">Bill</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerTransactions.map((tx) => (
                          <TableRow key={tx._id} className="hover:bg-gray-50/50">
                            <TableCell className="font-medium whitespace-nowrap">
                              {new Date(tx.date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {tx.items.map((item, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] py-0 px-1 bg-white border-gray-200">
                                    {item.itemName} ({item.qty})
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-gray-900">₹{tx.totalAmount.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">₹{tx.paidAmount.toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <Badge variant={tx.paymentMode === 'ONLINE' ? 'secondary' : 'outline'} className={`w-fit text-[10px] ${tx.paymentMode === 'ONLINE' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700'}`}>
                                  {tx.paymentMode}
                                </Badge>
                                {tx.paymentMode === 'ONLINE' && (
                                  <span
                                    className="text-[10px] text-blue-600 mt-1 font-bold underline cursor-help"
                                    title={tx.bankAccountId ? (JSON.stringify(tx.bankAccountId)) : 'No ID saved'}
                                  >
                                    {tx.bankAccountId?.accountName || (tx.bankAccountId ? 'ID: ' + String(tx.bankAccountId).substring(0, 6) : 'N/A')}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {tx.dueAmount > 0 ? (
                                <span className="font-bold text-red-600">₹{tx.dueAmount.toLocaleString()}</span>
                              ) : (
                                <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Paid full</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => generatePDF(tx)}
                                className="h-8 w-8 text-gray-500 hover:text-green-600 hover:bg-green-50"
                                title="Download PDF Invoice"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div >
    </DashboardLayout >
  );
}

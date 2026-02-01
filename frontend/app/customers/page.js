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
    gstNumber: '',
  });

  // Transaction History State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerTransactions, setCustomerTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);

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

  const loadLogoBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        try {
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject('Failed to load image');
      img.src = url;
    });
  };

  const generatePDF = async (transaction) => {
    setPdfLoadingId(transaction._id);
    try {
      const shopConfig = await fetchShopConfig();
      const doc = new jsPDF({
        format: 'a5',
        unit: 'mm',
      });

      // Add shop logo if available
      if (shopConfig.logoUrl) {
        try {
          const logo = await loadLogoBase64(shopConfig.logoUrl);
          doc.addImage(logo, 'PNG', 12, 10, 20, 20);
        } catch (err) {
          console.error('Failed to add logo to PDF:', err);
        }
      }

      // Shop details
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text(shopConfig.shopName || 'My Fertilizer Shop', 138, 18, { align: 'right' });
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(shopConfig.address || '', 138, 25, { align: 'right' });
      if (shopConfig.gstNumber) {
        doc.text(`GST: ${shopConfig.gstNumber}`, 138, 31, { align: 'right' });
      }

      doc.setLineWidth(0.5);
      doc.line(10, 38, 138, 38);

      // Invoice details
      doc.setFontSize(12);
      doc.text('INVOICE', 74, 46, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`Date: ${new Date(transaction.date).toLocaleDateString('en-IN')}`, 10, 52);

      let nextY = 58;
      doc.setFont(undefined, 'bold');
      doc.text(`Customer: ${transaction.customerName || 'Walk-in'}`, 10, nextY);
      doc.setFont(undefined, 'normal');
      nextY += 5;

      if (transaction.customerId && typeof transaction.customerId === 'object') {
        if (transaction.customerId.mobile) {
          doc.text(`Mobile: ${transaction.customerId.mobile}`, 10, nextY);
          nextY += 5;
        }
        if (transaction.customerId.address) {
          doc.text(`Address: ${transaction.customerId.address}`, 10, nextY);
          nextY += 5;
        }
        if (transaction.customerId.gstNumber) {
          doc.text(`GST: ${transaction.customerId.gstNumber}`, 10, nextY);
          nextY += 5;
        }
      }

      // Items table
      const tableData = transaction.items.map((item) => [
        item.itemName + (item.company ? ` (${item.company})` : ''),
        item.qty.toString(),
        `Rs. ${item.rate}`,
        `Rs. ${item.amount}`,
      ]);

      doc.autoTable({
        startY: nextY + 2,
        head: [['Item', 'Qty', 'Rate', 'Amount']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' },
        },
      });

      const finalY = doc.lastAutoTable.finalY + 10;

      // Totals Section
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      let currentY = finalY;
      const itemsSubtotal = transaction.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const labour = transaction.labourCharges || (transaction.totalAmount - itemsSubtotal);

      // Items Subtotal
      doc.text(`Items Subtotal:`, 90, currentY);
      doc.text(`Rs. ${itemsSubtotal.toLocaleString()}`, 138, currentY, { align: 'right' });
      currentY += 6;

      // Labour Charges
      if (labour > 0) {
        doc.text(`Labour/Loading:`, 90, currentY);
        doc.text(`Rs. ${labour.toLocaleString()}`, 138, currentY, { align: 'right' });
        currentY += 6;
      }

      // Grand Total
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text(`Total Amount:`, 90, currentY);
      doc.text(`Rs. ${transaction.totalAmount.toLocaleString()}`, 138, currentY, { align: 'right' });
      currentY += 8;

      // Paid Amount
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Paid Amount:`, 90, currentY);
      doc.text(`Rs. ${transaction.paidAmount.toLocaleString()}`, 138, currentY, { align: 'right' });
      currentY += 2;

      // Line separator
      doc.setDrawColor(200);
      doc.line(90, currentY + 2, 138, currentY + 2);
      currentY += 7;

      // Due Amount
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(220, 0, 0); // Red for Due
      doc.text(`Balance Due:`, 90, currentY);
      doc.text(`Rs. ${transaction.dueAmount.toLocaleString()}`, 138, currentY, { align: 'right' });
      doc.setTextColor(0);

      // Need to pass the last Y to payment info logic
      const finalTotalsY = currentY;

      // Payment Info
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const paymentInfoY = finalTotalsY + 15;

      doc.setDrawColor(240);
      doc.setFillColor(250, 250, 250);
      doc.rect(10, paymentInfoY - 5, 128, 25, 'F');

      doc.setFont(undefined, 'bold');
      doc.text(`Payment Details:`, 12, paymentInfoY);
      doc.setFont(undefined, 'normal');

      if (transaction.paidAmount === 0) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(220, 0, 0); // Red for Credit
        doc.text(`Mode: CREDIT (Full Due)`, 12, paymentInfoY + 5);
        doc.setTextColor(0);
        doc.setFont(undefined, 'normal');
      } else if (transaction.paymentMode === 'SPLIT' && transaction.payments && transaction.payments.length > 0) {
        doc.text(`Mode: SPLIT`, 12, paymentInfoY + 5);
        transaction.payments.forEach((p, i) => {
          const accountInfo = p.bankAccountId?.accountName ? ` (${p.bankAccountId.accountName})` : '';
          doc.text(`- ${p.mode}: Rs. ${p.amount}${accountInfo}`, 15, paymentInfoY + 10 + (i * 5));
        });
      } else {
        doc.text(`Mode: ${transaction.paymentMode}`, 12, paymentInfoY + 5);
        if (transaction.paymentMode === 'ONLINE' && transaction.bankAccountId?.accountName) {
          doc.text(`A/C: ${transaction.bankAccountId.accountName}`, 12, paymentInfoY + 10);
        }
      }

      // Delivery Info
      let deliveryInfoY = paymentInfoY + 28;
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      if (transaction.vehicleNumber) {
        doc.text(`Vehicle No: ${transaction.vehicleNumber}`, 12, deliveryInfoY);
        deliveryInfoY += 5;
      }
      const deliveryStatus = transaction.isDelivered ? 'YES' : 'NO';
      doc.text(`Delivered: ${deliveryStatus}`, 12, deliveryInfoY);

      // Footer
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.text('Thank you for your business!', 105, 185, { align: 'center' });
      doc.text('_____________________', 105, 195, { align: 'center' });
      doc.text('Authorized Signature', 105, 200, { align: 'center' });

      // Download
      doc.save(`invoice_${transaction._id}.pdf`);
    } finally {
      setPdfLoadingId(null);
    }
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
        setFormData({ name: '', mobile: '', address: '', gstNumber: '' });
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
                        {customer.gstNumber && (
                          <div>
                            <p className="text-sm text-gray-600">GST Number</p>
                            <p className="font-medium">{customer.gstNumber}</p>
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
          <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
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
                          <TableHead className="text-left w-[100px]">Date</TableHead>
                          <TableHead className="text-left w-[180px]">Items & Labour</TableHead>
                          <TableHead className="text-left w-[120px]">Vehicle No</TableHead>
                          <TableHead className="text-left w-[85px]">Total</TableHead>
                          <TableHead className="text-left w-[85px]">Paid</TableHead>
                          <TableHead className="text-left w-[180px]">Payment Details</TableHead>
                          <TableHead className="text-left font-bold text-red-600 w-[100px]">Pending Due</TableHead>
                          <TableHead className="text-left w-[40px]">Bill</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerTransactions.map((tx) => {
                          const itemsTotal = tx.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
                          const displayLabour = tx.labourCharges || (tx.totalAmount > itemsTotal ? (tx.totalAmount - itemsTotal) : 0);

                          return (
                            <TableRow key={tx._id} className="hover:bg-gray-50/50">
                              <TableCell className="font-medium whitespace-nowrap align-middle text-left px-2">
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm">
                                    {new Date(tx.date).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  {tx.isDelivered !== undefined && (
                                    <div className="flex justify-start pl-4">
                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] py-0 px-1 ${tx.isDelivered ? 'border-green-200 text-green-600 bg-green-50/50' : 'border-red-200 text-red-600 bg-red-50/50'}`}
                                      >
                                        {tx.isDelivered ? 'Delivered' : 'Not Delivered'}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-left align-middle px-2">
                                <div className="flex flex-col gap-1 py-1 items-start">
                                  {tx.items.map((item, i) => (
                                    <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 bg-white border-gray-200">
                                      {item.itemName} {item.company ? `| ${item.company}` : ''} ({item.qty})
                                    </Badge>
                                  ))}
                                  {displayLabour > 0 && (
                                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-orange-100 text-orange-700 border-orange-200 font-bold shadow-sm">
                                      Loading Cost: ₹{displayLabour}
                                    </Badge>
                                  )}

                                </div>
                              </TableCell>
                              <TableCell className="text-left align-middle">
                                {tx.vehicleNumber ? (
                                  <Badge variant="outline" className="w-fit text-[11px] py-0.5 px-2 border-blue-200 text-blue-700 bg-blue-50 font-bold uppercase tracking-wider">
                                    {tx.vehicleNumber}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-300 text-[10px]">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-left align-middle font-bold text-gray-900">₹{tx.totalAmount.toLocaleString()}</TableCell>
                              <TableCell className="text-left align-middle text-green-600 font-medium">₹{tx.paidAmount.toLocaleString()}</TableCell>
                              <TableCell className="text-left align-middle">
                                <div className="flex flex-col">
                                  {tx.paidAmount === 0 ? (
                                    <Badge className="w-fit text-[10px] bg-red-50 text-red-700 border-red-200">
                                      CREDIT (Full Due)
                                    </Badge>
                                  ) : tx.paymentMode === 'SPLIT' ? (
                                    <Badge className="w-fit text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                                      SPLIT ({tx.payments.length})
                                    </Badge>
                                  ) : (
                                    <Badge variant={tx.paymentMode === 'ONLINE' ? 'secondary' : 'outline'} className={`w-fit text-[10px] ${tx.paymentMode === 'ONLINE' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700'}`}>
                                      {tx.paymentMode}
                                    </Badge>
                                  )}

                                  {tx.paymentMode === 'ONLINE' && (
                                    <div className="flex flex-col mt-0.5 leading-tight">
                                      <span
                                        className="text-[10px] text-gray-700 font-bold"
                                        title={tx.bankAccountId ? (JSON.stringify(tx.bankAccountId)) : 'No ID saved'}
                                      >
                                        {tx.bankAccountId?.accountName || (tx.bankAccountId ? 'ID: ' + String(tx.bankAccountId).substring(0, 6) : 'N/A')}
                                      </span>
                                      {tx.payerName && (
                                        <span className="text-[9px] text-gray-400 italic font-medium">
                                          • From: <span className="text-gray-500 not-italic">{tx.payerName}</span>
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {tx.paymentMode === 'SPLIT' && (
                                    <div className="flex flex-col gap-0.5 mt-1 border-l-2 border-purple-100 pl-1.5">
                                      {tx.payments.map((p, i) => (
                                        <span key={i} className="text-[9px] text-gray-500 leading-tight">
                                          • {p.mode}: ₹{p.amount} {p.bankAccountId?.accountName && `(${p.bankAccountId.accountName})`}
                                          {p.payerName && <span className="italic ml-1 opacity-80">(From: {p.payerName})</span>}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-left align-middle">
                                {tx.dueAmount > 0 ? (
                                  <span className="font-bold text-red-600">₹{tx.dueAmount.toLocaleString()}</span>
                                ) : (
                                  <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Paid full</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-left align-middle">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => generatePDF(tx)}
                                  className="h-8 w-8 text-gray-500 hover:text-green-600 hover:bg-green-50"
                                  title="Download PDF Invoice"
                                  disabled={pdfLoadingId === tx._id}
                                >
                                  {pdfLoadingId === tx._id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
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

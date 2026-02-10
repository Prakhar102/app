'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Users, FileText, Loader2, Download, Building2, Phone, MapPin, Search, IndianRupee, CheckCircle2 } from 'lucide-react';
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
import PaymentCollectionModal from '@/components/PaymentCollectionModal';
import UpdatePaymentModal from '@/components/UpdatePaymentModal';

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
    dealerId: '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Transaction History State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerTransactions, setCustomerTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);

  // Payment Collection State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [customerToCollect, setCustomerToCollect] = useState(null);

  // Specific Bill Update State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [transactionToUpdate, setTransactionToUpdate] = useState(null);

  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (highlightId && customers.length > 0) {
      const element = document.getElementById(`customer-${highlightId}`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }, [highlightId, customers]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (error) {
      toast.error(t('failedFetchCustomers'));
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

  const loadStampBase64 = () => {
    return new Promise((resolve, reject) => {
      console.log('🔄 Loading stamp for PDF...');
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        console.log('✅ Stamp loaded! Dimensions:', img.width, 'x', img.height);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        try {
          const dataURL = canvas.toDataURL('image/png');
          console.log('✅ Stamp converted to base64! Length:', dataURL.length);
          resolve(dataURL);
        } catch (err) {
          console.error('❌ Failed to convert stamp:', err);
          reject(err);
        }
      };
      img.onerror = (e) => {
        console.error('❌ Failed to load stamp from /stamp.png');
        reject('Failed to load stamp');
      };
      img.src = '/stamp.png';
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
      const invoiceTitle = transaction.type === 'PAYMENT' ? 'PAYMENT RECEIPT' : (transaction.invoiceNumber ? `INVOICE - ${transaction.invoiceNumber}` : 'INVOICE');
      doc.text(invoiceTitle, 74, 46, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`Date: ${new Date(transaction.date).toLocaleDateString('en-IN')}`, 10, 52);

      // Vehicle No (Parallel to Date)
      doc.setFontSize(9);
      if (transaction.vehicleNumber) {
        doc.setFont(undefined, 'bold');
        const vLabel = "Vehicle No: ";
        const vValue = transaction.vehicleNumber;
        const vValueWidth = doc.getTextWidth(vValue);

        // Print Label (Black)
        doc.setTextColor(0, 0, 0);
        doc.text(vLabel, 138 - vValueWidth, 52, { align: 'right' });

        // Print Number (Blue)
        doc.setTextColor(37, 99, 235); // Blue color
        doc.text(vValue, 138, 52, { align: 'right' });

        doc.setTextColor(0, 0, 0); // Reset
      }

      // Delivered Status (Parallel to Customer)
      doc.setFont(undefined, 'bold');
      doc.text("Delivered: ", 128, 58, { align: 'right' });
      if (transaction.isDelivered) {
        doc.setTextColor(22, 163, 74);
        doc.text("YES", 138, 58, { align: 'right' });
      } else {
        doc.setTextColor(220, 0, 0);
        doc.text("NO", 138, 58, { align: 'right' });
      }
      doc.setTextColor(0);

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
        if (transaction.customerId.dealerId) {
          doc.text(`Dealer ID: ${transaction.customerId.dealerId}`, 10, nextY);
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
      const paymentInfoY = finalTotalsY + 10;

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
      } else if (transaction.payments && transaction.payments.length > 0) {
        transaction.payments.filter(p => p.amount > 0).forEach((p, i) => {
          let dateStr = '';
          // Use payment date if available, otherwise fallback to transaction date (Bill Date)
          const paymentDate = p.date ? new Date(p.date) : new Date(transaction.date);
          dateStr = `[${paymentDate.getDate()}/${paymentDate.getMonth() + 1}/${paymentDate.getFullYear().toString().slice(-2)}]`;

          const accountInfo = p.bankAccountId?.accountName ? ` (${p.bankAccountId.accountName})` : '';
          const payerInfo = p.payerName ? ` [By: ${p.payerName}]` : '';

          const lineText = dateStr ? `${dateStr} - ${p.mode}: Rs. ${p.amount}${accountInfo}${payerInfo}` : `- ${p.mode}: Rs. ${p.amount}${accountInfo}${payerInfo}`;
          doc.text(lineText, 15, paymentInfoY + 5 + (i * 5));
        });
      } else {
        doc.text(`Mode: ${transaction.paymentMode}`, 12, paymentInfoY + 5);
        if (transaction.paymentMode === 'ONLINE' && transaction.bankAccountId?.accountName) {
          doc.text(`A/C: ${transaction.bankAccountId.accountName}`, 12, paymentInfoY + 10);
        }
        if (transaction.payerName) {
          doc.text(`From: ${transaction.payerName}`, 12, paymentInfoY + 15);
        }
      }

      // Calculate dynamic footer position based on payment details
      let footerStartY = paymentInfoY + 30; // Default: 30mm after payment info start

      // Adjust if there are multiple payments (split or payment history)
      if (transaction.payments && transaction.payments.length > 1) {
        footerStartY = paymentInfoY + 30 + (transaction.payments.length * 5);
      }

      // Ensure minimum position and check for page break
      footerStartY = Math.max(footerStartY, 170);
      if (footerStartY > 175) {
        doc.addPage();
        footerStartY = 20;
      }

      // Footer with Stamp
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0);
      doc.text('Thank you for your business!', 105, footerStartY, { align: 'center' });

      const stampY = footerStartY + 8;
      const signatureY = stampY + 17;

      // Load and add stamp
      try {
        const stampBase64 = await loadStampBase64();
        console.log('📄 Adding stamp to PDF...');

        // Add blue border around stamp - matching text color
        doc.setDrawColor(63, 81, 181); // Exact match to stamp text color
        doc.setLineWidth(1.0); // 1.0mm border
        doc.rect(85, stampY, 40, 16); // Border exactly matching stamp size

        doc.addImage(stampBase64, 'PNG', 85, stampY, 40, 16);
        console.log('✅ Stamp added to PDF successfully!');
      } catch (err) {
        console.warn('⚠️ Stamp not available, using text fallback');
        // Fallback to text
        doc.setFontSize(12);
        doc.setTextColor(41, 128, 185);
        doc.text('KISAN KHAD BHANDAR', 105, stampY + 7, { align: 'center' });
        doc.setFontSize(9);
        doc.text('Partner/Auth, Signatory', 105, stampY + 12, { align: 'center' });
      }

      // Signature line
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);
      doc.text('_____________________', 105, signatureY, { align: 'center' });
      doc.text('Authorized Signature', 105, signatureY + 5, { align: 'center' });

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
        toast.success(t('customerAdded'));
        fetchCustomers();
        setFormData({ name: '', mobile: '', address: '', gstNumber: '', dealerId: '' });
        setShowForm(false);
      } else {
        toast.error(data.error || t('failedAddCustomer'));
      }
    } catch (error) {
      toast.error(t('errorAddingCustomer'));
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
      toast.error(t('failedLoadHistory'));
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleCollectPayment = (customer) => {
    setCustomerToCollect(customer);
    setIsPaymentModalOpen(true);
  };

  const handleUpdateTransaction = (tx) => {
    setTransactionToUpdate(tx);
    setIsUpdateModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
          <h1 className="text-3xl font-bold text-gray-900">{t('customers')}</h1>
          <div className="relative group w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
            </div>
            <Input
              type="text"
              placeholder={t('searchPlaceholder')}
              className="pl-10 h-10 text-sm border-2 border-gray-100 focus:border-green-500 shadow-sm rounded-xl transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Add Form Removed */}

        {/* Customers List */}
        <div className="grid gap-4">
          {(() => {
            const filteredCustomers = customers.filter(customer =>
              customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (customer.mobile && customer.mobile.includes(searchTerm)) ||
              (customer.address && customer.address.toLowerCase().includes(searchTerm.toLowerCase()))
            );

            if (filteredCustomers.length === 0) {
              return (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {searchTerm ? t('noCustomersMatch') : t('noProducts')}
                    </p>
                  </CardContent>
                </Card>
              );
            }

            return filteredCustomers.map((customer) => (
              <Card
                key={customer._id}
                id={`customer-${customer._id}`}
                className={highlightId === customer._id ? 'animate-highlight border-orange-500 shadow-md ring-1 ring-orange-500/20 rounded-2xl' : 'transition-all duration-300 rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-md'}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{customer.name}</h3>
                        {customer.totalDue > 0 && (
                          <Badge variant="destructive">{t('due')}: ₹{customer.totalDue}</Badge>
                        )}
                        {customer.totalDue === 0 && (
                          <Badge className="bg-green-600">{t('clear')}</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        {customer.mobile && (
                          <div>
                            <p className="text-sm text-gray-600">{t('mobile')}</p>
                            <p className="font-medium">{customer.mobile}</p>
                          </div>
                        )}
                        {customer.address && (
                          <div>
                            <p className="text-sm text-gray-600">{t('address')}</p>
                            <p className="font-medium">{customer.address}</p>
                          </div>
                        )}
                        {customer.gstNumber && (
                          <div>
                            <p className="text-sm text-gray-600">{t('gstNumber')}</p>
                            <p className="font-medium">{customer.gstNumber}</p>
                          </div>
                        )}
                        {customer.dealerId && (
                          <div>
                            <p className="text-sm text-gray-600">{t('dealerId')}</p>
                            <p className="font-medium text-green-600">{customer.dealerId}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4 gap-2">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => loadCustomerHistory(customer)}>
                      <FileText className="w-4 h-4 mr-2" />
                      {t('viewBills')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ));
          })()}
        </div>

        <PaymentCollectionModal
          open={isPaymentModalOpen}
          onOpenChange={setIsPaymentModalOpen}
          customer={customerToCollect}
          onSuccess={fetchCustomers}
        />

        <UpdatePaymentModal
          open={isUpdateModalOpen}
          onOpenChange={setIsUpdateModalOpen}
          transaction={transactionToUpdate}
          onSuccess={() => {
            fetchCustomers();
            if (customerToCollect) loadCustomerHistory(customerToCollect);
            else if (transactionToUpdate?.customerId) {
              const cust = customers.find(c => c._id === (transactionToUpdate.customerId._id || transactionToUpdate.customerId));
              if (cust) loadCustomerHistory(cust);
            }
          }}
        />

        {/* Transaction History Dialog */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
            <div className="p-6 border-b bg-gray-50/50">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <FileText className="w-6 h-6 text-green-600" />
                  {t('billingHistory')} - {selectedCustomer?.name}
                </DialogTitle>
                <DialogDescription>
                  {t('historySubtitle')}
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
                    <p className="text-center text-gray-500 py-8">{t('noHistory')}</p>
                  ) : (
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="text-left w-[100px]">{t('date')}</TableHead>
                          <TableHead className="text-left w-[180px]">{t('itemsLabour')}</TableHead>
                          <TableHead className="text-left w-[120px]">{t('vehicleNo')}</TableHead>
                          <TableHead className="text-left w-[85px]">{t('total')}</TableHead>
                          <TableHead className="text-left w-[85px]">{t('paid')}</TableHead>
                          <TableHead className="text-left w-[180px]">{t('paymentDetails')}</TableHead>
                          <TableHead className="text-left font-bold text-red-600 w-[100px]">{t('pendingDue')}</TableHead>
                          <TableHead className="text-center w-[60px]">{t('receipt')}</TableHead>
                          <TableHead className="text-center w-[60px]">{t('pay')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerTransactions.map((tx) => {
                          const isPayment = tx.type === 'PAYMENT';
                          const itemsTotal = tx.items?.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) || 0;
                          const displayLabour = tx.labourCharges || (tx.totalAmount > itemsTotal ? (tx.totalAmount - itemsTotal) : 0);

                          return (
                            <TableRow key={tx._id} className={`hover:bg-gray-50/50 ${isPayment ? 'bg-blue-50/30' : ''}`}>
                              <TableCell className="font-medium whitespace-nowrap align-middle text-left px-2">
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm">
                                    {new Date(tx.date).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  {!isPayment && tx.isDelivered !== undefined && (
                                    <div className="flex justify-start pl-4">
                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] py-0 px-1 ${tx.isDelivered ? 'border-green-200 text-green-600 bg-green-50/50' : 'border-red-200 text-red-600 bg-red-50/50'}`}
                                      >
                                        {tx.isDelivered ? t('delivered') : t('notDelivered')}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-left align-middle px-2">
                                <div className="flex flex-col gap-1 py-1 items-start">
                                  {isPayment ? (
                                    <Badge className="bg-blue-600 hover:bg-blue-600 text-[10px] py-0 px-1.5 font-bold uppercase tracking-wider">
                                      {t('paymentReceipt')}
                                    </Badge>
                                  ) : (
                                    <>
                                      {tx.items.map((item, i) => (
                                        <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 bg-white border-gray-200">
                                          {item.itemName} {item.company ? `| ${item.company}` : ''} ({item.qty})
                                        </Badge>
                                      ))}
                                      {displayLabour > 0 && (
                                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-orange-100 text-orange-700 border-orange-200 font-bold shadow-sm">
                                          {t('loadingCost')}: ₹{displayLabour}
                                        </Badge>
                                      )}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-left align-middle">
                                {!isPayment && tx.vehicleNumber ? (
                                  <Badge variant="outline" className="w-fit text-[11px] py-0.5 px-2 border-blue-200 text-blue-700 bg-blue-50 font-bold uppercase tracking-wider">
                                    {tx.vehicleNumber}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-300 text-[10px]">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-left align-middle font-bold text-gray-900">
                                {isPayment ? '-' : `₹${tx.totalAmount.toLocaleString()}`}
                              </TableCell>
                              <TableCell className={`text-left align-middle font-bold ${isPayment ? 'text-blue-600' : 'text-green-600'}`}>
                                ₹{tx.paidAmount.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-left align-middle">
                                <div className="flex flex-col">
                                  {(() => {
                                    const activePayments = tx.payments?.filter(p => p.amount > 0) || [];

                                    if (!isPayment && tx.paidAmount === 0) {
                                      return (
                                        <Badge className="w-fit text-[10px] bg-red-50 text-red-700 border-red-200">
                                          {t('fullDue')}
                                        </Badge>
                                      );
                                    }

                                    if (activePayments.length > 1) {
                                      return (
                                        <div className="flex flex-col gap-1">
                                          <Badge className="w-fit text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                                            {t('split')} ({activePayments.length})
                                          </Badge>
                                          <div className="flex flex-col gap-0.5 mt-1 border-l-2 border-purple-100 pl-1.5">
                                            {activePayments.map((p, i) => (
                                              <span key={i} className="text-[9px] text-gray-500 leading-tight">
                                                • {p.mode}: ₹{p.amount.toLocaleString()} {p.bankAccountId?.accountName && `(${p.bankAccountId.accountName})`}
                                                {p.payerName && <span className="italic ml-1 opacity-70">({t('from')}: {p.payerName})</span>}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    }

                                    // Single payment or fallback
                                    const singlePay = activePayments.length === 1 ? activePayments[0] : null;
                                    const mode = singlePay ? singlePay.mode : tx.paymentMode;
                                    const bank = singlePay ? singlePay.bankAccountId?.accountName : tx.bankAccountId?.accountName;
                                    const payer = singlePay ? singlePay.payerName : tx.payerName;

                                    return (
                                      <div className="flex flex-col gap-1">
                                        <Badge variant={mode === 'ONLINE' ? 'secondary' : 'outline'} className={`w-fit text-[10px] ${mode === 'ONLINE' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700'}`}>
                                          {mode === 'ONLINE' ? t('online') : t('cash')}
                                        </Badge>
                                        {mode === 'ONLINE' && (
                                          <div className="flex flex-col mt-0.5 leading-tight">
                                            <span className="text-[10px] text-gray-700 font-bold">
                                              {bank || t('onlineAccount')}
                                            </span>
                                            {payer && (
                                              <span className="text-[9px] text-gray-400 italic">
                                                • {t('from')}: {payer}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                  {isPayment && tx.description && (
                                    <span className="text-[10px] text-gray-500 mt-1 italic">{tx.description}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-left align-middle">
                                {isPayment ? '-' : (tx.dueAmount > 0 ? (
                                  <span className="font-bold text-red-600">₹{tx.dueAmount.toLocaleString()}</span>
                                ) : (
                                  <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">{t('paidFull')}</Badge>
                                ))}
                              </TableCell>
                              <TableCell className="text-center align-middle">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => generatePDF(tx)}
                                  className={`h-8 w-8 hover:bg-opacity-80 ${isPayment ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}
                                  title={t('generateInvoice')}
                                  disabled={pdfLoadingId === tx._id}
                                >
                                  {pdfLoadingId === tx._id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell className="text-center align-middle">
                                {!isPayment && (
                                  tx.dueAmount > 0 ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleUpdateTransaction(tx)}
                                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      title={t('collectPayment')}
                                    >
                                      <IndianRupee className="w-4 h-4" strokeWidth={3} />
                                    </Button>
                                  ) : (
                                    <div className="flex justify-center items-center h-8 w-8 text-green-600 mx-auto" title={t('paymentCompleted')}>
                                      <CheckCircle2 className="w-5 h-5 fill-green-50" />
                                    </div>
                                  )
                                )}
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

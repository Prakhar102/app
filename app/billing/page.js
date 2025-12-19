'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mic, Plus, Trash2, Download, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function BillingPage() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [mode, setMode] = useState('manual'); // 'manual' or 'voice'
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [shopConfig, setShopConfig] = useState({});

  // Manual billing form
  const [billItems, setBillItems] = useState([{ itemName: '', qty: '', rate: '', amount: 0 }]);
  const [billData, setBillData] = useState({
    customerName: '',
    customerId: '',
    paymentMode: 'CASH',
    paidAmount: 0,
  });

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchSettings();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success) {
        setShopConfig(data.user.shopConfig);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  // Voice Recognition
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
      toast.info('Listening... Speak now');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceText(transcript);
      processVoiceCommand(transcript);
    };

    recognition.onerror = (event) => {
      setListening(false);
      toast.error('Speech recognition error: ' + event.error);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  const processVoiceCommand = async (text) => {
    setVoiceLoading(true);
    try {
      const response = await fetch('/api/ai/process-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceText: text }),
      });

      const result = await response.json();
      if (result.success) {
        await createTransactionFromVoice(result.data);
        toast.success('Transaction created successfully!');
        setVoiceText('');
      } else {
        toast.error('Failed to process voice command');
      }
    } catch (error) {
      toast.error('Error processing voice command');
    } finally {
      setVoiceLoading(false);
    }
  };

  const createTransactionFromVoice = async (data) => {
    // Find or create customer
    let customerId = null;
    if (data.customerName) {
      const existingCustomer = customers.find(
        (c) => c.name.toLowerCase() === data.customerName.toLowerCase()
      );
      if (existingCustomer) {
        customerId = existingCustomer._id;
      } else {
        // Create new customer
        const customerResponse = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: data.customerName }),
        });
        const customerData = await customerResponse.json();
        if (customerData.success) {
          customerId = customerData.customer._id;
          fetchCustomers(); // Refresh customer list
        }
      }
    }

    // Create transaction
    const transactionData = {
      type: data.type || 'SALE',
      customerName: data.customerName || '',
      customerId: customerId,
      items: data.items || [],
      totalAmount: data.totalAmount || 0,
      paidAmount: data.paidAmount || 0,
      dueAmount: (data.totalAmount || 0) - (data.paidAmount || 0),
      paymentMode: data.paymentMode || 'CASH',
      description: data.description || '',
    };

    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transactionData),
    });

    const result = await response.json();
    if (result.success) {
      fetchProducts(); // Refresh to update stock
      if (transactionData.type === 'SALE') {
        generatePDF(result.transaction);
      }
    }
  };

  // Manual Billing Functions
  const addBillItem = () => {
    setBillItems([...billItems, { itemName: '', qty: '', rate: '', amount: 0 }]);
  };

  const removeBillItem = (index) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const updateBillItem = (index, field, value) => {
    const newItems = [...billItems];
    newItems[index][field] = value;

    // Auto-fill rate if product is selected
    if (field === 'itemName') {
      const product = products.find((p) => p.itemName === value);
      if (product) {
        newItems[index].rate = product.rate;
      }
    }

    // Calculate amount
    if (field === 'qty' || field === 'rate') {
      newItems[index].amount = (newItems[index].qty || 0) * (newItems[index].rate || 0);
    }

    setBillItems(newItems);
  };

  const calculateTotal = () => {
    return billItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const total = calculateTotal();
      const paid = parseFloat(billData.paidAmount) || 0;

      // Find or create customer
      let customerId = billData.customerId;
      if (billData.customerName && !customerId) {
        const existingCustomer = customers.find(
          (c) => c.name.toLowerCase() === billData.customerName.toLowerCase()
        );
        if (existingCustomer) {
          customerId = existingCustomer._id;
        } else {
          const customerResponse = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: billData.customerName }),
          });
          const customerData = await customerResponse.json();
          if (customerData.success) {
            customerId = customerData.customer._id;
            fetchCustomers();
          }
        }
      }

      const transactionData = {
        type: 'SALE',
        customerName: billData.customerName,
        customerId: customerId,
        items: billItems.map((item) => ({
          itemName: item.itemName,
          qty: parseFloat(item.qty),
          rate: parseFloat(item.rate),
          amount: item.amount,
        })),
        totalAmount: total,
        paidAmount: paid,
        dueAmount: total - paid,
        paymentMode: billData.paymentMode,
      };

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Bill created successfully!');
        generatePDF(result.transaction);
        // Reset form
        setBillItems([{ itemName: '', qty: '', rate: '', amount: 0 }]);
        setBillData({ customerName: '', customerId: '', paymentMode: 'CASH', paidAmount: 0 });
        fetchProducts();
      } else {
        toast.error('Failed to create bill');
      }
    } catch (error) {
      toast.error('Error creating bill');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = (transaction) => {
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

    // Footer
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.text('Thank you for your business!', 105, 185, { align: 'center' });
    doc.text('_____________________', 105, 195, { align: 'center' });
    doc.text('Authorized Signature', 105, 200, { align: 'center' });

    // Download
    doc.save(`invoice_${transaction._id}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('billing')}</h1>
        </div>

        {/* Mode Selection */}
        <div className="flex gap-4">
          <Button
            variant={mode === 'manual' ? 'default' : 'outline'}
            onClick={() => setMode('manual')}
            className={mode === 'manual' ? 'bg-green-600' : ''}
          >
            {t('manualBilling')}
          </Button>
          <Button
            variant={mode === 'voice' ? 'default' : 'outline'}
            onClick={() => setMode('voice')}
            className={mode === 'voice' ? 'bg-green-600' : ''}
          >
            <Mic className="w-4 h-4 mr-2" />
            {t('voiceCommand')}
          </Button>
        </div>

        {mode === 'voice' ? (
          <Card>
            <CardHeader>
              <CardTitle>AI Voice Assistant</CardTitle>
              <CardDescription>
                बोलकर बिल बनाएं - Examples: "Raju ko 10 Urea diya 5000 mein" or "500 ka chai kharcha"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4 p-8">
                <Button
                  size="lg"
                  onClick={startListening}
                  disabled={listening || voiceLoading}
                  className={`w-32 h-32 rounded-full ${
                    listening ? 'bg-red-600 animate-pulse' : 'bg-green-600'
                  }`}
                >
                  {voiceLoading ? (
                    <Loader2 className="w-12 h-12 animate-spin" />
                  ) : (
                    <Mic className="w-12 h-12" />
                  )}
                </Button>
                <p className="text-center text-sm text-gray-600">
                  {listening ? 'Listening...' : 'Click to speak'}
                </p>
              </div>
              {voiceText && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold">You said:</p>
                  <p className="text-gray-700 mt-1">{voiceText}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Create Bill</CardTitle>
              <CardDescription>Enter bill details manually</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                {/* Customer Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('customerName')}</Label>
                    <Input
                      list="customers-list"
                      placeholder="Customer name"
                      value={billData.customerName}
                      onChange={(e) => {
                        const name = e.target.value;
                        const customer = customers.find((c) => c.name === name);
                        setBillData({
                          ...billData,
                          customerName: name,
                          customerId: customer?._id || '',
                        });
                      }}
                      required
                    />
                    <datalist id="customers-list">
                      {customers.map((customer) => (
                        <option key={customer._id} value={customer.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <select
                      className="w-full h-10 px-3 py-2 border rounded-md"
                      value={billData.paymentMode}
                      onChange={(e) => setBillData({ ...billData, paymentMode: e.target.value })}
                    >
                      <option value="CASH">Cash</option>
                      <option value="ONLINE">Online</option>
                    </select>
                  </div>
                </div>

                {/* Bill Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg">Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addBillItem}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  {billItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Label className="text-xs">{t('itemName')}</Label>
                        <Input
                          list="products-list"
                          placeholder="Product"
                          value={item.itemName}
                          onChange={(e) => updateBillItem(index, 'itemName', e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">{t('quantity')}</Label>
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.qty}
                          onChange={(e) => updateBillItem(index, 'qty', e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">{t('rate')}</Label>
                        <Input
                          type="number"
                          placeholder="Rate"
                          value={item.rate}
                          onChange={(e) => updateBillItem(index, 'rate', e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">{t('amount')}</Label>
                        <Input
                          type="number"
                          value={item.amount}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                      <div className="col-span-1">
                        {billItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBillItem(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <datalist id="products-list">
                  {products.map((product) => (
                    <option key={product._id} value={product.itemName} />
                  ))}
                </datalist>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>₹{calculateTotal()}</span>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('paid')}</Label>
                    <Input
                      type="number"
                      placeholder="Amount paid"
                      value={billData.paidAmount}
                      onChange={(e) => setBillData({ ...billData, paidAmount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex justify-between text-lg font-semibold text-orange-600">
                    <span>{t('due')}:</span>
                    <span>₹{calculateTotal() - (parseFloat(billData.paidAmount) || 0)}</span>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-green-600" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      {t('generateBill')}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

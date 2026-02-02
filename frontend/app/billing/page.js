'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { Mic, Plus, Trash2, Save, Loader2, Building2, Phone, MapPin, FileText, ChevronDown } from 'lucide-react';
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
  const [bankAccounts, setBankAccounts] = useState([]);
  const [logoBase64, setLogoBase64] = useState('');

  // Manual billing form
  // Manual billing form
  const [billItems, setBillItems] = useState([{ itemName: '', qty: '', rate: '', amount: 0 }]);
  const [billData, setBillData] = useState({
    customerName: '',
    customerId: '',
    paymentMode: 'CASH',
    paidAmount: '0',
    bankAccountId: '',
    payerName: '',
    labourCharges: '',
    vehicleNumber: '',
    isDelivered: true,
  });

  // Split Payment State
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [payments, setPayments] = useState([{ mode: 'CASH', amount: '', bankAccountId: '', payerName: '' }]);

  // Add Customer Modal State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    mobile: '',
    address: '',
    gstNumber: '',
    dealerId: '',
  });
  const [customerLoading, setCustomerLoading] = useState(false);

  // Add Bank Account Modal State
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [newBankData, setNewBankData] = useState({
    accountName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    openingBalance: 0,
  });
  const [bankLoading, setBankLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchSettings();
    fetchBankAccounts();
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
        if (data.user.shopConfig.logoUrl) {
          // pre-load logo as base64
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
              const dataURL = canvas.toDataURL('image/png');
              setLogoBase64(dataURL);
            } catch (err) {
              console.error('Failed to convert logo to base64:', err);
            }
          };
          img.onerror = () => console.error('Failed to load logo image');
          img.src = data.user.shopConfig.logoUrl;
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await fetch('/api/bank-accounts');
      const data = await response.json();
      if (data.success) {
        setBankAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
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
    recognition.continuous = true;
    recognition.interimResults = true;

    let silenceTimer;
    let finalTranscript = '';

    recognition.onstart = () => {
      setListening(true);
      toast.info('Listening... Speak slowly, I am waiting for you.', { duration: 4000 });
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const currentText = (finalTranscript + interimTranscript).trim();
      setVoiceText(currentText);

      // Auto-process after 3 seconds of silence
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        recognition.stop();
      }, 3000);
    };

    recognition.onerror = (event) => {
      setListening(false);
      if (event.error !== 'no-speech') {
        toast.error('Speech recognition error: ' + event.error);
      }
    };

    recognition.onend = () => {
      setListening(false);
      const transcript = finalTranscript.trim();
      if (transcript) {
        processVoiceCommand(transcript);
      }
    };

    recognition.start();
  };

  const processVoiceCommand = async (text) => {
    setVoiceLoading(true);
    try {
      // Send products and customers for context matching
      const response = await fetch('/api/ai/process-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceText: text,
          products: products.map(p => ({ itemName: p.itemName, company: p.company, rate: p.rate })),
          customers: customers.map(c => ({ name: c.name }))
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Populate the manual billing form for user review/edit
        populateFormFromVoice(result.data);
        toast.success('बिल तैयार है! कृपया review करें और Save करें।');
      } else {
        toast.error('Failed to process voice command: ' + (result.error || ''));
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      toast.error('Error processing voice command');
    } finally {
      setVoiceLoading(false);
    }
  };

  // Populate manual billing form from AI-parsed voice data
  const populateFormFromVoice = (data) => {
    // Set customer
    const searchName = (data.customerName || '').trim().toLowerCase();
    let matchedCustomer = null;

    if (searchName) {
      // Try exact match first
      matchedCustomer = customers.find(
        c => c.name.trim().toLowerCase() === searchName
      );

      // Try partial match if exact match not found
      if (!matchedCustomer) {
        matchedCustomer = customers.find(
          c => c.name.trim().toLowerCase().includes(searchName) ||
            searchName.includes(c.name.trim().toLowerCase())
        );
      }
    }

    // Handle unknown customer warning - increased to 10 seconds (10000ms)
    if (data.customerName && !matchedCustomer && !data.isCustomerKnown) {
      toast.warning(`⚠️ "${data.customerName}" database me nahi hai. Pehle 'Add Customer' se shop name aur Dealer ID add karein.`, {
        duration: 10000,
        position: 'top-center'
      });
    }

    setBillData(prev => ({
      ...prev,
      customerName: matchedCustomer ? matchedCustomer.name : '',
      customerId: matchedCustomer?._id || '',
      paymentMode: data.paymentMode || 'CASH',
      paidAmount: String(data.paidAmount || 0),
      labourCharges: String(data.labourCharges || ''),
    }));

    // Set items - SUPER STRICT match with products
    if (data.items && data.items.length > 0) {
      const newItems = data.items.map(item => {
        const itemLower = (item.itemName || '').toLowerCase();
        const companyLower = (item.company || '').toLowerCase();

        // 1. Try exact match for both Item and Company
        let matchedProduct = products.find(p =>
          p.itemName.toLowerCase() === itemLower &&
          (p.company || '').toLowerCase() === companyLower
        );

        // 2. Try match Item if Company is empty or not found
        if (!matchedProduct) {
          matchedProduct = products.find(p =>
            p.itemName.toLowerCase() === itemLower
          );
        }

        // 3. Try partial match as fallback (only if very close)
        if (!matchedProduct) {
          matchedProduct = products.find(p =>
            p.itemName.toLowerCase().includes(itemLower) ||
            itemLower.includes(p.itemName.toLowerCase())
          );
        }

        // If no product found in database, SKIP this item (Strict Adherence)
        if (!matchedProduct) return null;

        const displayName = `${matchedProduct.itemName} | ${matchedProduct.company}`;
        const rate = matchedProduct.rate || 0;
        const qty = item.qty || 0;
        const amount = qty * rate;

        return {
          itemName: displayName,
          qty: String(qty),
          rate: String(rate),
          amount: amount
        };
      }).filter(Boolean); // Remove nulls (unrecognized items)

      setBillItems(newItems);
    }

    // Switch to manual mode so user can review/edit
    setMode('manual');
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
      bankAccountId: data.paymentMode === 'ONLINE' ? (bankAccounts[0]?._id || null) : null,
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
      const product = products.find((p) => {
        const displayName = p.company ? `${p.itemName} | ${p.company}` : p.itemName;
        const valLow = value.trim().toLowerCase();
        return displayName.toLowerCase() === valLow || p.itemName.toLowerCase() === valLow;
      });
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
    const itemsTotal = billItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const labour = parseFloat(billData.labourCharges) || 0;
    return itemsTotal + labour;
  };

  const addPaymentRow = () => {
    setPayments([...payments, { mode: 'CASH', amount: '', bankAccountId: '', payerName: '' }]);
  };

  const removePaymentRow = (index) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const updatePaymentRow = (index, field, value) => {
    setPayments(prevPayments => prevPayments.map((p, i) => {
      if (i !== index) return p;
      const updatedPayment = { ...p, [field]: value };
      if (field === 'mode' && value === 'CASH') {
        updatedPayment.bankAccountId = '';
        updatedPayment.payerName = '';
      }
      return updatedPayment;
    }));
  };

  const calculateTotalPaid = () => {
    if (isSplitPayment) {
      return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    }
    return parseFloat(billData.paidAmount) || 0;
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const total = calculateTotal();
      const paid = calculateTotalPaid();

      // Validation for Split Payments
      if (isSplitPayment) {
        for (const p of payments) {
          if (!p.amount || parseFloat(p.amount) <= 0) {
            toast.error('Please enter a valid amount for all payments');
            setLoading(false);
            return;
          }
          if (p.mode === 'ONLINE' && !p.bankAccountId) {
            toast.error('Please select a bank account for online payments');
            setLoading(false);
            return;
          }
        }
      } else if (billData.paymentMode === 'ONLINE' && !billData.bankAccountId) {
        toast.error('Please select a bank account for online payment');
        setLoading(false);
        return;
      }

      // Find or create customer
      let customerId = billData.customerId;
      if (billData.customerName && (!customerId || customerId === '')) {
        const searchName = billData.customerName.trim().toLowerCase();
        // Try exact match first
        let existingCustomer = customers.find(
          (c) => c.name.trim().toLowerCase() === searchName
        );

        // Try partial/fuzzy match if exact match not found
        if (!existingCustomer) {
          existingCustomer = customers.find(
            (c) => c.name.trim().toLowerCase().includes(searchName) ||
              searchName.includes(c.name.trim().toLowerCase())
          );
        }

        if (existingCustomer) {
          customerId = existingCustomer._id;
        } else {
          // Create new customer if not found
          const customerResponse = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: billData.customerName.trim() }),
          });
          const customerData = await customerResponse.json();
          if (customerData.success) {
            customerId = customerData.customer._id;
            fetchCustomers();
            toast.info(`New customer "${billData.customerName}" created!`);
          }
        }
      }

      const transactionData = {
        type: 'SALE',
        customerName: billData.customerName,
        customerId: customerId,
        items: billItems.map(item => ({
          ...item,
          itemName: item.itemName.split('|')[0].trim(),
          company: item.itemName.includes('|') ? item.itemName.split('|')[1].trim() : ''
        })),
        totalAmount: total,
        paidAmount: paid,
        dueAmount: total - paid,
        paymentMode: isSplitPayment ? 'SPLIT' : billData.paymentMode,
        bankAccountId: !isSplitPayment && billData.paymentMode === 'ONLINE' ? billData.bankAccountId : null,
        payerName: !isSplitPayment && billData.paymentMode === 'ONLINE' ? billData.payerName : '',
        labourCharges: parseFloat(billData.labourCharges) || 0,
        vehicleNumber: billData.vehicleNumber,
        isDelivered: billData.isDelivered,
        payments: isSplitPayment ? payments.map(p => ({
          ...p,
          amount: parseFloat(p.amount) || 0,
          bankAccountId: p.mode === 'ONLINE' && p.bankAccountId ? p.bankAccountId : null,
          payerName: p.mode === 'ONLINE' ? p.payerName : ''
        })) : [{
          mode: billData.paymentMode,
          amount: paid,
          bankAccountId: billData.paymentMode === 'ONLINE' && billData.bankAccountId ? billData.bankAccountId : null,
          payerName: billData.paymentMode === 'ONLINE' ? billData.payerName : ''
        }],
        description: `Sale to ${billData.customerName}`,
      };
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Bill saved successfully!');
        // generatePDF(result.transaction); - Removed auto-download per user request
        // Reset form
        setBillItems([{ itemName: '', qty: '', rate: '', amount: 0 }]);
        setBillData({ customerName: '', customerId: '', paymentMode: 'CASH', paidAmount: '0', labourCharges: '', vehicleNumber: '', isDelivered: true });
        setIsSplitPayment(false);
        setPayments([{ mode: 'CASH', amount: '', bankAccountId: '' }]);
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

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setCustomerLoading(true);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomerData),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Customer added successfully');
        await fetchCustomers(); // Refresh list

        // Auto-select the new customer
        setBillData(prev => ({
          ...prev,
          customerName: data.customer.name,
          customerId: data.customer._id
        }));

        setIsCustomerModalOpen(false);
        setNewCustomerData({ name: '', mobile: '', address: '', gstNumber: '', dealerId: '' });
      } else {
        toast.error(data.error || 'Failed to add customer');
      }
    } catch (error) {
      toast.error('Error adding customer');
    } finally {
      setCustomerLoading(false);
    }
  };

  const handleCreateBankAccount = async (e) => {
    e.preventDefault();
    setBankLoading(true);
    try {
      const response = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBankData),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Bank account added successfully');
        await fetchBankAccounts(); // Refresh list

        // Auto-select the new account
        setBillData(prev => ({
          ...prev,
          bankAccountId: data.account._id
        }));

        setIsBankModalOpen(false);
        setNewBankData({
          accountName: '',
          accountNumber: '',
          ifscCode: '',
          upiId: '',
          openingBalance: 0,
        });
      } else {
        toast.error(data.error || 'Failed to add bank account');
      }
    } catch (error) {
      toast.error('Error adding bank account');
    } finally {
      setBankLoading(false);
    }
  };

  const generatePDF = (transaction) => {
    const doc = new jsPDF({
      format: 'a5',
      unit: 'mm',
    });

    // Add shop logo if available
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 12, 10, 20, 20);
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
    const invoiceTitle = transaction.invoiceNumber ? `INVOICE - ${transaction.invoiceNumber}` : 'INVOICE';
    doc.text(invoiceTitle, 74, 46, { align: 'center' });
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
        const payerInfo = p.payerName ? ` [From: ${p.payerName}]` : '';
        doc.text(`- ${p.mode}: Rs. ${p.amount}${accountInfo}${payerInfo}`, 15, paymentInfoY + 10 + (i * 5));
      });
    } else {
      doc.text(`Mode: ${transaction.paymentMode}`, 12, paymentInfoY + 5);
      if (transaction.paymentMode === 'ONLINE') {
        if (transaction.bankAccountId?.accountName) {
          doc.text(`A/C: ${transaction.bankAccountId.accountName}`, 12, paymentInfoY + 10);
        }
        if (transaction.payerName) {
          doc.text(`From: ${transaction.payerName}`, 12, paymentInfoY + 15);
        }
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
              <CardTitle>{t('voiceAssistant')}</CardTitle>
              <CardDescription>
                {t('voiceDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4 p-8">
                <Button
                  size="lg"
                  onClick={startListening}
                  disabled={listening || voiceLoading}
                  className={`w-32 h-32 rounded-full ${listening ? 'bg-red-600 animate-pulse' : 'bg-green-600'
                    }`}
                >
                  {voiceLoading ? (
                    <Loader2 className="w-12 h-12 animate-spin" />
                  ) : (
                    <Mic className="w-12 h-12" />
                  )}
                </Button>
                <p className="text-center text-sm text-gray-600">
                  {listening ? t('listening') : t('clickToSpeak')}
                </p>
              </div>
              {voiceText && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold">{t('youSaid')}:</p>
                  <p className="text-gray-700 mt-1">{voiceText}</p>
                </div>
              )}

              {/* Hindi Voice Examples */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-semibold text-green-800 mb-2">🎤 ऐसे बोलें:</p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• "Prakhar Parth को 100 बोरा Urea दिया 266 rate से"</li>
                  <li>• "Maa Kali Traders को 50 bag DAP IPL, सब उधार"</li>
                  <li>• "Ram Singh को 20 बोरा Zinc, 30 बोरा MOP, total 45000, cash लिया"</li>
                  <li>• "Shyam को 10 NPK Kisan 500 rate, 5000 total, 3000 जमा, 2000 बकाया"</li>
                </ul>
                <p className="text-xs text-green-600 mt-2">बोलने के बाद फॉर्म में देखें, edit करें, फिर Save करें</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t('createBill')}</CardTitle>
              <CardDescription>{t('enterBillDetails')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                {/* Customer Details */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('shopName')}</Label>
                    <div className="flex gap-2">
                      <Input
                        list="customers-list"
                        placeholder={t('enterShopName')}
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
                        className="flex-1"
                      />
                      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" size="icon" title="Add New Customer">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t('addNewShop')}</DialogTitle>
                            <DialogDescription>
                              {t('enterShopDetails')}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-green-600" />
                                {t('shopName')}
                              </Label>
                              <Input
                                id="name"
                                placeholder={t('enterShopName')}
                                value={newCustomerData.name}
                                onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                                className="border-green-100 focus:border-green-500"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-green-600" />
                                {t('gstNumber')} ({t('optional')})
                              </Label>
                              <Input
                                id="gstNumber"
                                placeholder={t('enterGst')}
                                value={newCustomerData.gstNumber}
                                onChange={(e) => setNewCustomerData({ ...newCustomerData, gstNumber: e.target.value })}
                                className="border-green-100 focus:border-green-500"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-green-600" />
                                {t('dealerId')}
                              </Label>
                              <Input
                                id="dealerId"
                                placeholder={t('enterDealerId')}
                                value={newCustomerData.dealerId}
                                onChange={(e) => setNewCustomerData({ ...newCustomerData, dealerId: e.target.value })}
                                className="border-green-100 focus:border-green-500"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-green-600" />
                                {t('mobile')}
                              </Label>
                              <Input
                                id="mobile"
                                type="tel"
                                placeholder={t('enterMobile')}
                                value={newCustomerData.mobile}
                                onChange={(e) => setNewCustomerData({ ...newCustomerData, mobile: e.target.value })}
                                className="border-green-100 focus:border-green-500"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-green-600" />
                                {t('address')}
                              </Label>
                              <Input
                                id="address"
                                placeholder={t('enterAddress')}
                                value={newCustomerData.address}
                                onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                                className="border-green-100 focus:border-green-500"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" onClick={handleCreateCustomer} disabled={customerLoading} className="bg-green-600 w-full">
                              {customerLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                              {t('addShop')}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <datalist id="customers-list">
                      {customers.map((customer) => (
                        <option key={customer._id} value={customer.name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Bill Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg">{t('items')}</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addBillItem}>
                      <Plus className="w-4 h-4 mr-1" />
                      {t('addItem')}
                    </Button>
                  </div>

                  {billItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Label className="text-xs">{t('itemName')}</Label>
                        <Input
                          list={`products-list-${index}`}
                          placeholder="Select Product"
                          value={item.itemName}
                          onChange={(e) => updateBillItem(index, 'itemName', e.target.value)}
                          required
                        />
                        <datalist id={`products-list-${index}`}>
                          {/* 
                            Logic: 
                            1. Get unique base item names.
                            2. If current value matches a base item name exactly, show variants.
                            3. Otherwise, show base item names.
                          */}
                          {(() => {
                            // Normalize unique names case-insensitively
                            const nameMap = products.reduce((acc, p) => {
                              const lowName = p.itemName.trim().toLowerCase();
                              if (!acc.has(lowName)) acc.set(lowName, p.itemName);
                              return acc;
                            }, new Map());

                            const uniqueNames = Array.from(nameMap.values());
                            const currentInputLow = item.itemName.trim().toLowerCase();

                            // Check if current input matches any base name case-insensitively
                            let matchingOriginalName = null;
                            for (const [low, orig] of nameMap.entries()) {
                              if (low === currentInputLow) {
                                matchingOriginalName = orig;
                                break;
                              }
                            }

                            if (matchingOriginalName) {
                              const variants = products.filter(p =>
                                p.itemName.trim().toLowerCase() === currentInputLow
                              );
                              // Only show variants if there are multiple or if the single variant has a company
                              if (variants.length > 1 || (variants[0]?.company)) {
                                return variants.map(v => (
                                  <option key={v._id} value={`${v.itemName} | ${v.company || 'Standard'}`} />
                                ));
                              }
                            }

                            return uniqueNames.map(name => (
                              <option key={name} value={name} />
                            ));
                          })()}
                        </datalist>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">{t('quantity')}</Label>
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.qty}
                          onWheel={(e) => e.target.blur()}
                          onChange={(e) => updateBillItem(index, 'qty', e.target.value)}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">{t('rate')}</Label>
                        <Input
                          type="number"
                          placeholder="Rate"
                          value={item.rate}
                          onWheel={(e) => e.target.blur()}
                          onChange={(e) => updateBillItem(index, 'rate', e.target.value)}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">{t('amount')}</Label>
                        <Input
                          type="number"
                          value={item.amount}
                          readOnly
                          onWheel={(e) => e.target.blur()}
                          className="bg-gray-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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


                {/* Totals & Payment */}
                <div className="border-t pt-4 space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  {/* Labour Charges Input */}
                  <div className="flex items-center gap-3 py-2">
                    <Label className="text-gray-600 whitespace-nowrap">Labour Cost / Loading (₹):</Label>
                    <Input
                      type="number"
                      placeholder="Enter cost..."
                      onWheel={(e) => e.target.blur()}
                      className="h-8 font-medium border-gray-200 flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={billData.labourCharges}
                      onChange={(e) => setBillData({ ...billData, labourCharges: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 py-2 border-t border-dashed border-gray-200">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">{t('vehicleNumber')}</Label>
                      <Input
                        placeholder="e.g. UP 80 AX 1234"
                        className="h-8 font-medium border-gray-200"
                        value={billData.vehicleNumber}
                        onChange={(e) => setBillData({ ...billData, vehicleNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">{t('deliveredQuestion')}</Label>
                      <div className="flex gap-2 h-8 items-center">
                        <Button
                          type="button"
                          variant={billData.isDelivered ? 'default' : 'outline'}
                          size="sm"
                          className={`flex-1 h-7 text-xs ${billData.isDelivered ? 'bg-green-600 hover:bg-green-700' : ''}`}
                          onClick={() => setBillData({ ...billData, isDelivered: true })}
                        >
                          {t('yes')}
                        </Button>
                        <Button
                          type="button"
                          variant={!billData.isDelivered ? 'destructive' : 'outline'}
                          size="sm"
                          className={`flex-1 h-7 text-xs ${!billData.isDelivered ? 'bg-red-600 hover:bg-red-700' : ''}`}
                          onClick={() => setBillData({ ...billData, isDelivered: false })}
                        >
                          {t('no')}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 1. Total display */}
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t border-dashed border-gray-200">
                    <span>{t('totalBill')}:</span>
                    <span>₹{calculateTotal()}</span>
                  </div>

                  {/* 2. Payment Method selection (Move into flow) */}
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-blue-900 font-bold">{t('howToPay')}</Label>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="split-mode-bottom" className="text-xs cursor-pointer text-blue-600 font-medium">{t('splitPaymentQuestion')}</Label>
                        <input
                          id="split-mode-bottom"
                          type="checkbox"
                          checked={isSplitPayment}
                          onChange={(e) => setIsSplitPayment(e.target.checked)}
                          className="w-4 h-4 accent-blue-600"
                        />
                      </div>
                    </div>

                    {!isSplitPayment ? (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <select
                            className="w-full h-10 px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                            value={billData.paymentMode}
                            onChange={(e) => setBillData({ ...billData, paymentMode: e.target.value })}
                          >
                            <option value="CASH">{t('cash')}</option>
                            <option value="ONLINE">{t('online')}</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                        {billData.paymentMode === 'ONLINE' && (
                          <div className="flex-1 flex flex-col gap-2">
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <select
                                  className="w-full h-10 px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                  value={billData.bankAccountId}
                                  onChange={(e) => setBillData({ ...billData, bankAccountId: e.target.value })}
                                  required
                                >
                                  <option value="">{t('selectAccount')}</option>
                                  {bankAccounts.map((acc) => (
                                    <option key={acc._id} value={acc._id}>{acc.accountName}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                              </div>
                              <Dialog open={isBankModalOpen} onOpenChange={setIsBankModalOpen}>
                                <DialogTrigger asChild>
                                  <Button type="button" variant="outline" size="icon" className="border-gray-300 hover:bg-blue-50 text-blue-600" title="Add New Bank Account">
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>{t('addNewBank')}</DialogTitle>
                                    <DialogDescription>
                                      {t('enterShopDetails')}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>{t('bankAccountName')} (e.g., PhonePe, SBI)</Label>
                                      <Input
                                        value={newBankData.accountName}
                                        onChange={(e) => setNewBankData({ ...newBankData, accountName: e.target.value })}
                                        required
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>{t('accountNumber')} ({t('optional')})</Label>
                                      <Input
                                        value={newBankData.accountNumber}
                                        onChange={(e) => setNewBankData({ ...newBankData, accountNumber: e.target.value })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>{t('ifscCode')} ({t('optional')})</Label>
                                      <Input
                                        value={newBankData.ifscCode}
                                        onChange={(e) => setNewBankData({ ...newBankData, ifscCode: e.target.value })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>{t('upiId')} ({t('optional')})</Label>
                                      <Input
                                        value={newBankData.upiId}
                                        onChange={(e) => setNewBankData({ ...newBankData, upiId: e.target.value })}
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button type="button" onClick={handleCreateBankAccount} disabled={bankLoading} className="bg-blue-600 w-full hover:bg-blue-700">
                                      {bankLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                      {t('addAccount')}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <Input
                              placeholder={t('fromHolder')}
                              className="h-10 border-gray-300 shadow-sm"
                              value={billData.payerName}
                              onChange={(e) => setBillData({ ...billData, payerName: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 bg-white p-3 rounded-xl border border-gray-200">
                        {payments.map((p, idx) => (
                          <div key={idx} className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                            <div className="flex gap-2 items-start">
                              <div className="flex-1 flex gap-2">
                                <select
                                  className="flex-1 h-9 text-sm px-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                  value={p.mode}
                                  onChange={(e) => updatePaymentRow(idx, 'mode', e.target.value)}
                                >
                                  <option value="CASH">{t('cash')}</option>
                                  <option value="ONLINE">{t('online')}</option>
                                </select>
                                {p.mode === 'ONLINE' && (
                                  <div className="relative flex-1">
                                    <select
                                      className="flex-1 h-9 text-sm px-2 pr-8 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                      value={p.bankAccountId}
                                      onChange={(e) => updatePaymentRow(idx, 'bankAccountId', e.target.value)}
                                      required
                                    >
                                      <option value="">{t('selectAccount')}</option>
                                      {bankAccounts.map((account) => (
                                        <option key={account._id} value={account._id}>
                                          {account.accountName} - {account.accountNumber.slice(-4)}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                  </div>
                                )}
                              </div>
                              <div className="w-32">
                                <Input
                                  type="number"
                                  placeholder={t('amount')}
                                  className="h-9 text-sm border-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={p.amount}
                                  onWheel={(e) => e.target.blur()}
                                  onChange={(e) => updatePaymentRow(idx, 'amount', e.target.value)}
                                  required
                                />
                              </div>
                              {payments.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-red-500 hover:bg-red-50"
                                  onClick={() => removePaymentRow(idx)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            {p.mode === 'ONLINE' && (
                              <Input
                                placeholder={t('fromPayer')}
                                className="h-8 text-xs border-gray-200 bg-white"
                                value={p.payerName}
                                onChange={(e) => updatePaymentRow(idx, 'payerName', e.target.value)}
                              />
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full h-9 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          onClick={addPaymentRow}
                        >
                          <Plus className="w-3 h-3 mr-1" /> {t('addAnotherMethod')}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* 3. Paid Amount input */}
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <Label className="font-bold text-gray-700">{t('amountPaid')} (₹)</Label>
                    <Input
                      type="number"
                      placeholder={t('amountPaid')}
                      value={isSplitPayment ? calculateTotalPaid() : billData.paidAmount}
                      onWheel={(e) => e.target.blur()}
                      onChange={(e) => setBillData({ ...billData, paidAmount: e.target.value })}
                      readOnly={isSplitPayment}
                      className={`${isSplitPayment ? "bg-gray-100 font-bold" : "text-lg ring-1 ring-gray-200"} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      required
                    />
                  </div>

                  {/* 4. Due amount display */}
                  <div className="flex justify-between text-lg font-bold text-orange-600 pt-4 border-t border-gray-200">
                    <span>{t('due')}:</span>
                    <span>₹{calculateTotal() - calculateTotalPaid()}</span>
                  </div>


                </div>

                <div className="flex justify-center pt-4">
                  <Button type="submit" className="w-40 bg-green-600" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('creating')}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {t('saveBill')}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout >
  );
}

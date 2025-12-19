'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const translations = {
  en: {
    dashboard: 'Dashboard',
    billing: 'Billing',
    inventory: 'Inventory',
    customers: 'Customers',
    reports: 'Reports',
    settings: 'Settings',
    logout: 'Logout',
    todaySales: "Today's Sales",
    totalDue: 'Total Due',
    lowStock: 'Low Stock Items',
    totalProducts: 'Total Products',
    addProduct: 'Add Product',
    itemName: 'Item Name',
    quantity: 'Quantity',
    rate: 'Rate',
    unit: 'Unit',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    customerName: 'Customer Name',
    mobile: 'Mobile',
    address: 'Address',
    amount: 'Amount',
    paid: 'Paid',
    due: 'Due',
    cash: 'Cash',
    online: 'Online',
    sale: 'Sale',
    purchase: 'Purchase',
    payment: 'Payment',
    expense: 'Expense',
    voiceCommand: 'Voice Command',
    manualBilling: 'Manual Billing',
    generateBill: 'Generate Bill',
    shopName: 'Shop Name',
    gstNumber: 'GST Number',
    updateSettings: 'Update Settings',
    createStaff: 'Create Staff Account',
    dayBook: 'Day Book',
    totalCash: 'Total Cash',
    totalOnline: 'Total Online',
    closingBalance: 'Closing Balance',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    billing: 'बिलिंग',
    inventory: 'स्टॉक',
    customers: 'ग्राहक',
    reports: 'रिपोर्ट',
    settings: 'सेटिंग',
    logout: 'लॉगआउट',
    todaySales: 'आज की बिक्री',
    totalDue: 'कुल उधार',
    lowStock: 'कम स्टॉक',
    totalProducts: 'कुल उत्पाद',
    addProduct: 'उत्पाद जोड़ें',
    itemName: 'वस्तु का नाम',
    quantity: 'मात्रा',
    rate: 'दर',
    unit: 'इकाई',
    save: 'सेव करें',
    cancel: 'रद्द करें',
    edit: 'संपादित',
    delete: 'हटाएं',
    customerName: 'ग्राहक का नाम',
    mobile: 'मोबाइल',
    address: 'पता',
    amount: 'राशि',
    paid: 'भुगतान',
    due: 'उधार',
    cash: 'नकद',
    online: 'ऑनलाइन',
    sale: 'बिक्री',
    purchase: 'खरीद',
    payment: 'भुगतान',
    expense: 'खर्च',
    voiceCommand: 'आवाज कमांड',
    manualBilling: 'मैनुअल बिलिंग',
    generateBill: 'बिल बनाएं',
    shopName: 'दुकान का नाम',
    gstNumber: 'जीएसटी नंबर',
    updateSettings: 'सेटिंग अपडेट करें',
    createStaff: 'स्टाफ अकाउंट बनाएं',
    dayBook: 'रोजनामचा',
    totalCash: 'कुल नकद',
    totalOnline: 'कुल ऑनलाइन',
    closingBalance: 'अंतिम शेष',
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('hi');

  useEffect(() => {
    const saved = localStorage.getItem('language');
    if (saved) setLanguage(saved);
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'hi' : 'en';
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const t = (key) => translations[language][key] || key;

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

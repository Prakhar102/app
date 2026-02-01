'use client';
import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, IndianRupee, CreditCard, Banknote } from 'lucide-react';

export default function PaymentCollectionModal({ open, onOpenChange, customer, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [formData, setFormData] = useState({
        amount: '',
        paymentMode: 'CASH',
        bankAccountId: '',
        payerName: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (open) {
            fetchBankAccounts();
            setFormData(prev => ({
                ...prev,
                amount: '',
                description: `Payment received from ${customer?.name}`,
                date: new Date().toISOString().split('T')[0],
            }));
        }
    }, [open, customer]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            return toast.error('Please enter a valid amount');
        }
        if (formData.paymentMode === 'ONLINE' && !formData.bankAccountId) {
            return toast.error('Please select a bank account');
        }

        setLoading(true);
        try {
            const transactionData = {
                type: 'PAYMENT',
                customerId: customer._id,
                customerName: customer.name,
                totalAmount: 0, // It's a payment, not a sale
                paidAmount: parseFloat(formData.amount),
                dueAmount: -parseFloat(formData.amount), // This decrements the customer's totalDue
                paymentMode: formData.paymentMode,
                bankAccountId: formData.paymentMode === 'ONLINE' ? formData.bankAccountId : null,
                payerName: formData.paymentMode === 'ONLINE' ? formData.payerName : null,
                description: formData.description,
                date: new Date(formData.date),
            };

            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transactionData),
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Payment recorded successfully!');
                if (onSuccess) onSuccess();
                onOpenChange(false);
            } else {
                toast.error(data.error || 'Failed to record payment');
            }
        } catch (error) {
            toast.error('Error recording payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IndianRupee className="w-5 h-5 text-green-600" />
                        Collect Payment
                    </DialogTitle>
                    <DialogDescription>
                        Record a payment from <strong>{customer?.name}</strong>. Current due: ₹{customer?.totalDue?.toLocaleString()}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount Recieved (₹)</Label>
                        <Input
                            id="amount"
                            type="number"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Payment Mode</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                type="button"
                                variant={formData.paymentMode === 'CASH' ? 'default' : 'outline'}
                                className="w-full"
                                onClick={() => setFormData({ ...formData, paymentMode: 'CASH', bankAccountId: '' })}
                            >
                                <Banknote className="w-4 h-4 mr-2" />
                                Cash
                            </Button>
                            <Button
                                type="button"
                                variant={formData.paymentMode === 'ONLINE' ? 'default' : 'outline'}
                                className="w-full"
                                onClick={() => setFormData({ ...formData, paymentMode: 'ONLINE' })}
                            >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Online
                            </Button>
                        </div>
                    </div>

                    {formData.paymentMode === 'ONLINE' && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="space-y-2">
                                <Label htmlFor="bankAccount">Bank Account</Label>
                                <select
                                    id="bankAccount"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.bankAccountId}
                                    onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                                    required
                                >
                                    <option value="">Select Account</option>
                                    {bankAccounts.map((acc) => (
                                        <option key={acc._id} value={acc._id}>
                                            {acc.accountName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="payerName">Payer Name</Label>
                                <Input
                                    id="payerName"
                                    placeholder="Who is paying?"
                                    value={formData.payerName}
                                    onChange={(e) => setFormData({ ...formData, payerName: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="date">Payment Date</Label>
                        <Input
                            id="date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Notes (Optional)</Label>
                        <Input
                            id="description"
                            placeholder="Add any notes here..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Payment'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

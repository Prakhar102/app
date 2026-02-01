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
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, IndianRupee, CreditCard, Banknote, Plus, Trash2, Split } from 'lucide-react';

export default function UpdatePaymentModal({ open, onOpenChange, transaction, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [isSplit, setIsSplit] = useState(false);
    const [payments, setPayments] = useState([{ mode: 'CASH', amount: '', bankAccountId: '', payerName: '' }]);
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (open && transaction) {
            fetchBankAccounts();
            setIsSplit(false);
            setPayments([{ mode: 'CASH', amount: transaction.dueAmount.toString(), bankAccountId: '', payerName: '' }]);
            setDescription(`Payment for bill on ${new Date(transaction.date).toLocaleDateString()}`);
            setDate(new Date().toISOString().split('T')[0]);
        }
    }, [open, transaction]);

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

    const addPayment = () => {
        setPayments([...payments, { mode: 'CASH', amount: '', bankAccountId: '', payerName: '' }]);
    };

    const removePayment = (index) => {
        setPayments(payments.filter((_, i) => i !== index));
        if (payments.length <= 2) setIsSplit(false);
    };

    const updatePayment = (index, field, value) => {
        const newPayments = [...payments];
        newPayments[index][field] = value;
        setPayments(newPayments);
    };

    const calculateTotalPaying = () => {
        return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const totalPaying = calculateTotalPaying();

        if (totalPaying <= 0) {
            return toast.error('Please enter a valid amount');
        }
        if (totalPaying > transaction.dueAmount + 0.01) {
            return toast.error(`Total exceeds remaining due (₹${transaction.dueAmount})`);
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/transactions/${transaction._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payments: payments.filter(p => parseFloat(p.amount) > 0),
                    description,
                    date: new Date(date),
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Payment recorded successfully!');
                if (onSuccess) onSuccess();
                onOpenChange(false);
            } else {
                toast.error(data.error || 'Failed to update payment');
            }
        } catch (error) {
            toast.error('Error updating payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <IndianRupee className="w-5 h-5 text-blue-600" />
                        Clear Bill Dues
                    </DialogTitle>
                    <DialogDescription>
                        Recording payment for bill dated <strong>{new Date(transaction?.date).toLocaleDateString()}</strong>.
                        Remaining: <span className="text-red-600 font-bold">₹{transaction?.dueAmount?.toLocaleString()}</span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-semibold">Payment Details</Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (isSplit) {
                                    setPayments([{ ...payments[0], amount: calculateTotalPaying().toString() }]);
                                }
                                setIsSplit(!isSplit);
                            }}
                            className={`h-8 rounded-xl ${isSplit ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' : ''}`}
                        >
                            <Split className="w-3.5 h-3.5 mr-1.5" />
                            {isSplit ? 'Single Mode' : 'Split Payment'}
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {payments.map((payment, index) => (
                            <Card key={index} className="p-4 bg-gray-50/50 border-gray-100 relative group rounded-2xl">
                                {isSplit && payments.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white shadow-sm text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removePayment(index)}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                )}

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold text-gray-400">Mode</Label>
                                        <select
                                            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={payment.mode}
                                            onChange={(e) => updatePayment(index, 'mode', e.target.value)}
                                        >
                                            <option value="CASH">Cash</option>
                                            <option value="ONLINE">Online</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold text-gray-400">Amount (₹)</Label>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            className="h-10 rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={payment.amount}
                                            onChange={(e) => updatePayment(index, 'amount', e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {payment.mode === 'ONLINE' && (
                                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase font-bold text-gray-400">Bank Account</Label>
                                            <select
                                                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={payment.bankAccountId}
                                                onChange={(e) => updatePayment(index, 'bankAccountId', e.target.value)}
                                                required
                                            >
                                                <option value="">Select Account</option>
                                                {bankAccounts.map((acc) => (
                                                    <option key={acc._id} value={acc._id}>{acc.accountName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase font-bold text-gray-400">Payer Name</Label>
                                            <Input
                                                placeholder="Who is paying?"
                                                className="h-10 rounded-xl"
                                                value={payment.payerName}
                                                onChange={(e) => updatePayment(index, 'payerName', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ))}

                        {isSplit && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full border-dashed border-2 rounded-2xl h-12 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/30"
                                onClick={addPayment}
                            >
                                <Plus className="w-4 h-4 mr-1.5" />
                                Add Another Mode
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="space-y-1.5">
                            <Label htmlFor="payDate" className="text-[10px] uppercase font-bold text-gray-400">Payment Date</Label>
                            <Input
                                id="payDate"
                                type="date"
                                className="rounded-xl h-10"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="payDesc" className="text-[10px] uppercase font-bold text-gray-400">Notes</Label>
                            <Input
                                id="payDesc"
                                placeholder="Optional notes..."
                                className="rounded-xl h-10"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-green-600 p-4 rounded-2xl flex justify-between items-center mt-6 shadow-md shadow-green-100">
                        <span className="text-sm text-green-50 font-medium">Total Paying</span>
                        <span className="text-xl font-black text-white">₹{calculateTotalPaying().toLocaleString()}</span>
                    </div>

                    <DialogFooter className="pt-4 flex !justify-between gap-3">
                        <Button type="button" variant="ghost" className="rounded-xl flex-1 h-12" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 rounded-xl flex-[1.5] h-12 text-base font-bold">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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

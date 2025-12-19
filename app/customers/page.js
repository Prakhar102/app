'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Users } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('customers')}</h1>
          <Button onClick={() => setShowForm(!showForm)} className="bg-green-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Add Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('customerName')}</Label>
                    <Input
                      placeholder="Customer name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('mobile')}</Label>
                    <Input
                      type="tel"
                      placeholder="Mobile number"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>{t('address')}</Label>
                    <Input
                      placeholder="Address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading} className="bg-green-600">
                    {t('save')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    {t('cancel')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

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
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

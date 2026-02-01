'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Store, Users, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [showStaffForm, setShowStaffForm] = useState(false);

  const [shopData, setShopData] = useState({
    shopName: '',
    address: '',
    gstNumber: '',
    logoUrl: '',
  });

  const [staffData, setStaffData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
  });

  useEffect(() => {
    fetchSettings();
    if (session?.user?.role === 'OWNER') {
      fetchStaff();
    }
  }, [session]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success) {
        setShopData(data.user.shopConfig);
      }
    } catch (error) {
      toast.error(t('failedFetchSettings'));
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/settings/staff');
      const data = await response.json();
      if (data.success) {
        setStaff(data.staff);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const handleShopUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopConfig: shopData }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('settingsUpdated'));
      } else {
        toast.error(t('failedUpdateSettings'));
      }
    } catch (error) {
      toast.error(t('errorUpdatingSettings'));
    } finally {
      setLoading(false);
    }
  };

  const handleStaffCreate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/settings/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('staffCreated'));
        setStaffData({ name: '', email: '', mobile: '', password: '' });
        setShowStaffForm(false);
        fetchStaff();
      } else {
        toast.error(data.error || t('failedCreateStaff'));
      }
    } catch (error) {
      toast.error(t('errorCreatingStaff'));
    } finally {
      setLoading(false);
    }
  };

  const isOwner = session?.user?.role === 'OWNER';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('settings')}</h1>
          <p className="text-gray-600 mt-1">{t('manageShop')}</p>
        </div>

        {/* Shop Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              {t('shopConfig')}
            </CardTitle>
            <CardDescription>{t('updateShopDetails')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleShopUpdate} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('shopName')}</Label>
                  <Input
                    placeholder={t('enterYourShopName')}
                    value={shopData.shopName}
                    onChange={(e) => setShopData({ ...shopData, shopName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('gstNumber')}</Label>
                  <Input
                    placeholder={t('gstOptional')}
                    value={shopData.gstNumber}
                    onChange={(e) => setShopData({ ...shopData, gstNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t('address')}</Label>
                  <Input
                    placeholder={t('shopAddress')}
                    value={shopData.address}
                    onChange={(e) => setShopData({ ...shopData, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t('logoUrlOptional')}</Label>
                  <Input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={shopData.logoUrl}
                    onChange={(e) => setShopData({ ...shopData, logoUrl: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="bg-green-600">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('updating')}
                  </>
                ) : (
                  t('updateSettings')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Staff Management (Owner Only) */}
        {isOwner && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {t('staffManagement')}
                  </CardTitle>
                  <CardDescription>{t('manageStaffAccounts')}</CardDescription>
                </div>
                <Button onClick={() => setShowStaffForm(!showStaffForm)} className="bg-green-600">
                  {t('createStaff')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create Staff Form */}
              {showStaffForm && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-semibold mb-4">{t('createNewStaffAccount')}</h3>
                  <form onSubmit={handleStaffCreate} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('name')}</Label>
                        <Input
                          placeholder={t('enterStaffName')}
                          value={staffData.name}
                          onChange={(e) => setStaffData({ ...staffData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('email')}</Label>
                        <Input
                          type="email"
                          placeholder="staff@example.com"
                          value={staffData.email}
                          onChange={(e) => setStaffData({ ...staffData, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('mobile')}</Label>
                        <Input
                          type="tel"
                          placeholder="9876543210"
                          value={staffData.mobile}
                          onChange={(e) => setStaffData({ ...staffData, mobile: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('password')}</Label>
                        <Input
                          type="password"
                          placeholder={t('password')}
                          value={staffData.password}
                          onChange={(e) => setStaffData({ ...staffData, password: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={loading} className="bg-green-600">
                        {t('createStaff')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowStaffForm(false)}
                      >
                        {t('cancel')}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Staff List */}
              <div className="space-y-3">
                <h3 className="font-semibold">{t('staffMembers')} ({staff.length})</h3>
                {staff.length === 0 ? (
                  <p className="text-gray-500 text-sm">{t('noProducts')}</p>
                ) : (
                  staff.map((member) => (
                    <div key={member._id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{member.name}</p>
                            <Badge variant="secondary">{t('staff')}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{member.email}</p>
                          <p className="text-sm text-gray-600">{member.mobile}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t('accountInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">{t('name')}</p>
                <p className="font-semibold">{session?.user?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('email')}</p>
                <p className="font-semibold">{session?.user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('role')}</p>
                <Badge variant={isOwner ? 'default' : 'secondary'}>
                  {session?.user?.role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

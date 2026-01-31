'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Package, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from 'next-auth/react';

export default function InventoryPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    itemName: '',
    qty: '',
    rate: '',
    unit: 'Kg',
    lowStockThreshold: 10,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      toast.error('Failed to fetch products');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingProduct ? '/api/products/update' : '/api/products';
      const body = editingProduct
        ? { productId: editingProduct._id, ...formData }
        : formData;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingProduct ? 'Product updated!' : 'Product added!');
        fetchProducts();
        resetForm();
      } else {
        toast.error(data.error || 'Failed to save product');
      }
    } catch (error) {
      toast.error('Error saving product');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      itemName: product.itemName,
      qty: product.qty,
      rate: product.rate,
      unit: product.unit,
      lowStockThreshold: product.lowStockThreshold,
    });
    setShowForm(true);
  };

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch('/api/products/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Product deleted!');
        fetchProducts();
      } else {
        toast.error(data.error || 'Failed to delete product');
      }
    } catch (error) {
      toast.error('Error deleting product');
    }
  };

  const resetForm = () => {
    setFormData({
      itemName: '',
      qty: '',
      rate: '',
      unit: 'Kg',
      lowStockThreshold: 10,
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const isOwner = session?.user?.role === 'OWNER';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('inventory')}</h1>
          <Button onClick={() => setShowForm(!showForm)} className="bg-green-600">
            <Plus className="w-4 h-4 mr-2" />
            {t('addProduct')}
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('itemName')}</Label>
                    <Input
                      placeholder="e.g., Urea, DAP"
                      value={formData.itemName}
                      onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('quantity')}</Label>
                    <Input
                      type="number"
                      placeholder="Stock quantity"
                      value={formData.qty}
                      onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('rate')} (per unit)</Label>
                    <Input
                      type="number"
                      placeholder="Price"
                      value={formData.rate}
                      onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('unit')}</Label>
                    <select
                      className="w-full h-10 px-3 py-2 border rounded-md"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option value="Kg">Kg</option>
                      <option value="Bag">Bag</option>
                      <option value="Litre">Litre</option>
                      <option value="Piece">Piece</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Low Stock Alert Threshold</Label>
                    <Input
                      type="number"
                      placeholder="Alert when below"
                      value={formData.lowStockThreshold}
                      onChange={(e) =>
                        setFormData({ ...formData, lowStockThreshold: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading} className="bg-green-600">
                    {t('save')}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    {t('cancel')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Products List */}
        <div className="grid gap-4">
          {products.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No products added yet</p>
              </CardContent>
            </Card>
          ) : (
            products.map((product) => (
              <Card key={product._id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{product.itemName}</h3>
                        {product.qty <= product.lowStockThreshold && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <div>
                          <p className="text-sm text-gray-600">Stock</p>
                          <p className="font-semibold">
                            {product.qty} {product.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Rate</p>
                          <p className="font-semibold">₹{product.rate}/{product.unit}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Value</p>
                          <p className="font-semibold">₹{product.qty * product.rate}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(product)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {isOwner && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(product._id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
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

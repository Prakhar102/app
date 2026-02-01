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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function InventoryPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    itemName: '',
    company: '',
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
      company: product.company || '',
      qty: product.qty,
      rate: product.rate,
      unit: product.unit,
      lowStockThreshold: product.lowStockThreshold,
    });
    setShowForm(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      company: '',
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
                    <Label>Company Name</Label>
                    <Input
                      placeholder="e.g., IFFCO, TATA"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
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
        <div className="grid gap-6">
          {products.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No products added yet</p>
              </CardContent>
            </Card>
          ) : (
            (() => {
              // Group products by itemName (case-insensitive)
              const grouped = products.reduce((acc, p) => {
                const normalizedKey = p.itemName.trim().toLowerCase();
                if (!acc[normalizedKey]) {
                  acc[normalizedKey] = {
                    displayName: p.itemName, // Keep original casing for title (from first encountered)
                    variants: []
                  };
                }
                acc[normalizedKey].variants.push(p);
                return acc;
              }, {});

              return Object.entries(grouped).map(([key, group]) => {
                const { displayName, variants } = group;
                return (
                  <Card key={key} className="overflow-hidden border-2 border-gray-100 shadow-sm">
                    <CardHeader className="bg-gray-50/50 pb-3 border-b">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <CardTitle className="text-xl font-bold text-gray-800 uppercase tracking-tight">
                            {displayName}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {variants.length} brand variant{variants.length > 1 ? 's' : ''} available
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-gray-50/30">
                          <TableRow>
                            <TableHead className="font-bold text-gray-600">Company / Brand</TableHead>
                            <TableHead className="font-bold text-gray-600">Current Stock</TableHead>
                            <TableHead className="font-bold text-gray-600">Rate</TableHead>
                            <TableHead className="font-bold text-gray-600">Total Value</TableHead>
                            <TableHead className="text-right font-bold text-gray-600">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {variants.map((v) => (
                            <TableRow key={v._id} className="hover:bg-gray-50/50 transition-colors">
                              <TableCell className="font-semibold py-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-700 uppercase">{v.company || 'Standard'}</span>
                                  {v.qty <= v.lowStockThreshold && (
                                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase font-black animate-pulse">
                                      Low Stock
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium text-gray-700">
                                {v.qty} <span className="text-xs text-gray-400 font-normal uppercase">{v.unit}</span>
                              </TableCell>
                              <TableCell className="font-medium text-gray-700">₹{v.rate}</TableCell>
                              <TableCell className="font-bold text-green-600">₹{(v.qty * v.rate).toLocaleString()}</TableCell>
                              <TableCell className="text-right py-4">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(v);
                                    }}
                                    title="Edit Product"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  {isOwner && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                      onClick={() => handleDelete(v._id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              });
            })()
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

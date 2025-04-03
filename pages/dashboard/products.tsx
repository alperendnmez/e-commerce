import ProductForm from '@/components/ProductForm';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Head from 'next/head';

export default function ProductsPage() {
  const [products, setProducts] = useState<{ id: number; name: string; description: string; price: number; }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<{ id?: number; name: string; description: string; price: number; } | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    // Fetch products data
    axios.get('/api/products')
      .then(response => setProducts(response.data))
      .catch(error => console.error('Error fetching products:', error));
  }, []);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setShowForm(true);
  };

  const handleEditProduct = (product: { id: number; name: string; description: string; price: number; }) => {
    setSelectedProduct(product);
    setShowForm(true);
  };

  const handleDeleteProduct = (id: number) => {
    if (confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      axios.delete(`/api/products/by-id/${id}`)
        .then(() => setProducts(products.filter(product => product.id !== id)))
        .catch(error => console.error('Error deleting product:', error));
    }
  };

  const handleSubmit = (data: { id?: number; name: string; description: string; price: number; }) => {
    if (data.id !== undefined) {
      // Update existing product
      axios.put(`/api/products/by-id/${data.id}`, data)
        .then(() => {
          setProducts(products.map(product => product.id === data.id ? { ...product, ...data } : product));
          setShowForm(false);
        })
        .catch(error => console.error('Error updating product:', error));
    } else {
      // Add new product
      axios.post('/api/products', data)
        .then(response => {
          setProducts([...products, response.data]);
          setShowForm(false);
        })
        .catch(error => console.error('Error adding product:', error));
    }
  };

  return (
    <>
      <Head>
        <title>Ürün Yönetimi | Furnico</title>
      </Head>
      <main className='p-6 bg-background text-foreground'>
        <h1 className='text-4xl font-bold mb-6'>Ürün Yönetimi</h1>
        <button onClick={handleAddProduct} className='bg-primary text-white p-4 rounded-lg shadow-md mb-4'>Yeni Ürün Ekle</button>
        {showForm && <ProductForm initialData={selectedProduct || undefined} onSubmit={handleSubmit} />}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {products.map(product => (
            <div key={product.id} className='bg-card p-6 shadow-lg rounded-lg'>
              <h2 className='text-lg font-medium text-primary-foreground'>{product.name}</h2>
              <p className='text-md'>{product.description}</p>
              <p className='text-md font-bold'>{product.price} TL</p>
              <button onClick={() => handleEditProduct(product)} className='bg-secondary text-white p-2 rounded-lg shadow-md mt-2'>Düzenle</button>
              <button onClick={() => handleDeleteProduct(product.id)} className='bg-destructive text-white p-2 rounded-lg shadow-md mt-2'>Sil</button>
            </div>
          ))}
        </div>
      </main>
    </>
  );
} 
import { useState, useEffect } from 'react';
import axios from 'axios';
import Head from 'next/head';

export default function InventoryPage() {
  const [products, setProducts] = useState<{ id: number; name: string; stock: number; }[]>([]);

  useEffect(() => {
    // Fetch products data
    axios.get('/api/products')
      .then(response => setProducts(response.data))
      .catch(error => console.error('Error fetching products:', error));
  }, []);

  const handleUpdateStock = (id: number, stock: number) => {
    // Logic to update product stock
    axios.put(`/api/products/by-id/${id}`, { stock })
      .then(() => {
        setProducts(products.map(product => product.id === id ? { ...product, stock } : product));
      })
      .catch(error => console.error('Error updating product stock:', error));
  };

  return (
    <>
      <Head>
        <title>Stok Yönetimi | Furnico</title>
      </Head>
      <main className='p-6 bg-background text-foreground'>
        <h1 className='text-4xl font-bold mb-6'>Stok Yönetimi</h1>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {products.map(product => (
            <div key={product.id} className='bg-card p-6 shadow-lg rounded-lg'>
              <h2 className='text-lg font-medium text-primary-foreground'>{product.name}</h2>
              <p className='text-md'>Stok: {product.stock}</p>
              <button onClick={() => handleUpdateStock(product.id, product.stock + 1)} className='bg-secondary text-white p-2 rounded-lg shadow-md mt-2'>Stok Arttır</button>
              <button onClick={() => handleUpdateStock(product.id, product.stock - 1)} className='bg-destructive text-white p-2 rounded-lg shadow-md mt-2'>Stok Azalt</button>
            </div>
          ))}
        </div>
      </main>
    </>
  );
} 
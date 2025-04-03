import { useState, useEffect } from 'react';
import axios from 'axios';
import Head from 'next/head';

export default function OrdersPage() {
  const [orders, setOrders] = useState<{ id: number; status: string; }[]>([]);

  useEffect(() => {
    // Fetch orders data
    axios.get('/api/orders')
      .then(response => setOrders(response.data))
      .catch(error => console.error('Error fetching orders:', error));
  }, []);

  const handleUpdateOrderStatus = (id: number, status: string) => {
    // Logic to update order status
    axios.put(`/api/orders/${id}`, { status })
      .then(() => {
        setOrders(orders.map(order => order.id === id ? { ...order, status } : order));
      })
      .catch(error => console.error('Error updating order status:', error));
  };

  return (
    <>
      <Head>
        <title>Sipariş Yönetimi | Furnico</title>
      </Head>
      <main className='p-6 bg-background text-foreground'>
        <h1 className='text-4xl font-bold mb-6'>Sipariş Yönetimi</h1>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {orders.map(order => (
            <div key={order.id} className='bg-card p-6 shadow-lg rounded-lg'>
              <h2 className='text-lg font-medium text-primary-foreground'>Sipariş ID: {order.id}</h2>
              <p className='text-md'>Durum: {order.status}</p>
              <button onClick={() => handleUpdateOrderStatus(order.id, 'Tamamlandı')} className='bg-secondary text-white p-2 rounded-lg shadow-md mt-2'>Tamamlandı</button>
              <button onClick={() => handleUpdateOrderStatus(order.id, 'İptal Edildi')} className='bg-destructive text-white p-2 rounded-lg shadow-md mt-2'>İptal Et</button>
            </div>
          ))}
        </div>
      </main>
    </>
  );
} 
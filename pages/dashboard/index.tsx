// pages/dashboard/index.tsx
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { getSession } from 'next-auth/react'
import Head from 'next/head'
import { ReactElement, useEffect, useState } from 'react'
import axios from 'axios'
import { Chart } from '@/components/ui/Chart'

export async function getServerSideProps(context: any) {
  const session = await getSession(context)

  if (!session || session.user.role !== 'ADMIN') {
    return {
      redirect: {
        destination: '/',
        permanent: false
      }
    }
  }

  return {
    props: {}
  }
}

export default function DashboardPage() {
  const [overview, setOverview] = useState({
    totalSales: 0,
    totalOrders: 0,
    newUsers: 0,
    lowStock: 0
  });
  const [salesData, setSalesData] = useState({
    labels: [],
    datasets: [{
      label: 'Satışlar',
      data: [],
      borderColor: 'rgb(53, 162, 235)',
      backgroundColor: 'rgba(53, 162, 235, 0.5)',
    }]
  });
  const [userActivity, setUserActivity] = useState({
    labels: [],
    datasets: [{
      label: 'Kullanıcı Etkinliği',
      data: [],
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.5)',
    }]
  });

  useEffect(() => {
    // Fetch overview data
    axios.get('/api/dashboard/overview')
      .then(response => setOverview(response.data))
      .catch(error => console.error('Error fetching overview data:', error));

    // Fetch sales data
    axios.get('/api/dashboard/sales')
      .then(response => {
        const data = response.data;
        if (data && typeof data === 'object') {
          setSalesData({
            labels: data.labels || [],
            datasets: Array.isArray(data.datasets) 
              ? data.datasets.map((dataset: any) => ({
                  ...dataset,
                  data: Array.isArray(dataset.data) ? dataset.data : []
                }))
              : [{
                  label: 'Satışlar',
                  data: [],
                  borderColor: 'rgb(53, 162, 235)',
                  backgroundColor: 'rgba(53, 162, 235, 0.5)',
                }]
          });
        }
      })
      .catch(error => console.error('Error fetching sales data:', error));

    // Fetch user activity data
    axios.get('/api/dashboard/user-activity')
      .then(response => {
        const data = response.data;
        if (data && typeof data === 'object') {
          setUserActivity({
            labels: data.labels || [],
            datasets: Array.isArray(data.datasets) 
              ? data.datasets.map((dataset: any) => ({
                  ...dataset,
                  data: Array.isArray(dataset.data) ? dataset.data : []
                }))
              : [{
                  label: 'Kullanıcı Etkinliği',
                  data: [],
                  borderColor: 'rgb(255, 99, 132)',
                  backgroundColor: 'rgba(255, 99, 132, 0.5)',
                }]
          });
        }
      })
      .catch(error => console.error('Error fetching user activity data:', error));
  }, []);

  return (
    <>
      <Head>
        <title>Admin Dashboard | Furnico</title>
      </Head>
      <main className='p-6 bg-background text-foreground'>
        <h1 className='text-4xl font-bold mb-6'>Admin Dashboard</h1>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          <div className='bg-card p-6 shadow-lg rounded-lg'>
            <h2 className='text-lg font-medium text-primary-foreground'>Toplam Satışlar</h2>
            <p className='text-3xl font-bold'>{overview.totalSales} TL</p>
          </div>
          <div className='bg-card p-6 shadow-lg rounded-lg'>
            <h2 className='text-lg font-medium text-primary-foreground'>Toplam Siparişler</h2>
            <p className='text-3xl font-bold'>{overview.totalOrders}</p>
          </div>
          <div className='bg-card p-6 shadow-lg rounded-lg'>
            <h2 className='text-lg font-medium text-primary-foreground'>Yeni Kullanıcılar</h2>
            <p className='text-3xl font-bold'>{overview.newUsers}</p>
          </div>
          <div className='bg-card p-6 shadow-lg rounded-lg'>
            <h2 className='text-lg font-medium text-primary-foreground'>Düşük Stok</h2>
            <p className='text-3xl font-bold'>{overview.lowStock}</p>
          </div>
        </div>
        <div className='mt-10'>
          <h2 className='text-2xl font-semibold text-primary mb-4'>Satış Trendleri</h2>
          <div className='bg-card p-6 shadow-lg rounded-lg h-72'>
            <Chart data={salesData} />
          </div>
        </div>
        <div className='mt-10'>
          <h2 className='text-2xl font-semibold text-primary mb-4'>Kullanıcı Etkinliği</h2>
          <div className='bg-card p-6 shadow-lg rounded-lg h-72'>
            <Chart data={userActivity} />
          </div>
        </div>
        <div className='mt-10'>
          <h2 className='text-2xl font-semibold text-primary mb-4'>Hızlı Erişim</h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <button className='bg-primary text-white p-4 rounded-lg shadow-md'>Yeni Ürün Ekle</button>
            <button className='bg-primary text-white p-4 rounded-lg shadow-md'>Siparişleri Yönet</button>
            <button className='bg-primary text-white p-4 rounded-lg shadow-md'>Kullanıcıları Yönet</button>
          </div>
        </div>
      </main>
    </>
  )
}
DashboardPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>
}
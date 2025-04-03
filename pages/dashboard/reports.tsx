import { useState, useEffect } from 'react';
import axios from 'axios';
import Head from 'next/head';
import { Chart } from '@/components/ui/Chart';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
}

export default function ReportsPage() {
  const [salesData, setSalesData] = useState<ChartData>({ labels: [], datasets: [] });
  const [userActivityData, setUserActivityData] = useState<ChartData>({ labels: [], datasets: [] });
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  useEffect(() => {
    // Fetch sales data
    axios.get('/api/reports/sales', {
      params: { startDate, endDate }
    })
      .then(response => {
        const data = response.data;
        setSalesData({
          labels: data.labels || [],
          datasets: data.datasets ? data.datasets.map((dataset: { label: string; data: number[]; borderColor: string; backgroundColor: string; }) => ({
            ...dataset,
            data: dataset.data || []
          })) : []
        });
      })
      .catch(error => console.error('Error fetching sales data:', error));

    // Fetch user activity data
    axios.get('/api/reports/user-activity', {
      params: { startDate, endDate }
    })
      .then(response => {
        const data = response.data;
        setUserActivityData({
          labels: data.labels || [],
          datasets: data.datasets ? data.datasets.map((dataset: { label: string; data: number[]; borderColor: string; backgroundColor: string; }) => ({
            ...dataset,
            data: dataset.data || []
          })) : []
        });
      })
      .catch(error => console.error('Error fetching user activity data:', error));
  }, [startDate, endDate]);

  return (
    <>
      <Head>
        <title>Raporlar | Furnico</title>
      </Head>
      <main className='p-6 bg-background text-foreground'>
        <h1 className='text-4xl font-bold mb-6'>Raporlar</h1>
        <div className='flex space-x-4 mb-6'>
          <DatePicker selected={startDate} onChange={(date: Date | null) => date && setStartDate(date)} />
          <DatePicker selected={endDate} onChange={(date: Date | null) => date && setEndDate(date)} />
        </div>
        <div className='mt-10'>
          <h2 className='text-2xl font-semibold text-primary mb-4'>Satış Raporları</h2>
          <div className='bg-card p-6 shadow-lg rounded-lg h-72'>
            <Chart data={salesData} />
          </div>
        </div>
        <div className='mt-10'>
          <h2 className='text-2xl font-semibold text-primary mb-4'>Kullanıcı Etkinliği Raporları</h2>
          <div className='bg-card p-6 shadow-lg rounded-lg h-72'>
            <Chart data={userActivityData} />
          </div>
        </div>
      </main>
    </>
  );
} 
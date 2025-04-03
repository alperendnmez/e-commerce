import { useState, useEffect } from 'react';
import axios from 'axios';
import Head from 'next/head';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface Notification {
  id: number;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Fetch notifications data
    axios.get('/api/notifications')
      .then(response => setNotifications(response.data))
      .catch(error => console.error('Error fetching notifications data:', error));
  }, []);

  const markAsRead = (id: number) => {
    // Mark notification as read logic
  };

  return (
    <>
      <Head>
        <title>Bildirimler | Furnico</title>
      </Head>
      <main className='p-6 bg-background text-foreground'>
        <h1 className='text-4xl font-bold mb-6'>Bildirimler</h1>
        <Table>
          <thead>
            <tr>
              {['Message', 'Type', 'Date', 'Actions'].map(column => <th key={column}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {notifications.map(notification => (
              <tr key={notification.id} className={notification.isRead ? 'opacity-50' : ''}>
                <td>{notification.message}</td>
                <td>{notification.type}</td>
                <td>{new Date(notification.createdAt).toLocaleString()}</td>
                <td>
                  <Button onClick={() => markAsRead(notification.id)}>Mark as Read</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </main>
    </>
  );
} 
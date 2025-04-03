import { useState, useEffect } from 'react';
import axios from 'axios';
import Head from 'next/head';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const roles = ['Admin', 'Editor', 'Customer'];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    // Fetch users data
    axios.get('/api/users')
      .then(response => setUsers(response.data))
      .catch(error => console.error('Error fetching users data:', error));
  }, []);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = (userId: number) => {
    // Delete user logic
  };

  const handleSave = () => {
    // Save user logic
    setIsModalOpen(false);
  };

  return (
    <>
      <Head>
        <title>Kullanıcılar | Furnico</title>
      </Head>
      <main className='p-6 bg-background text-foreground'>
        <h1 className='text-4xl font-bold mb-6'>Kullanıcı Yönetimi</h1>
        <Table>
          <thead>
            <tr>
              {['Name', 'Email', 'Role', 'Actions'].map(column => <th key={column}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <Button onClick={() => handleEdit(user)}>Edit</Button>
                  <Button onClick={() => handleDelete(user.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Button onClick={() => setIsModalOpen(true)}>Yeni Kullanıcı Ekle</Button>
        <Dialog open={isModalOpen}>
          <DialogClose asChild>
            <button onClick={() => setIsModalOpen(false)}>Close</button>
          </DialogClose>
          <form onSubmit={handleSave}>
            <label>Name</label>
            <Input value={selectedUser?.name || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({...selectedUser, name: e.target.value as string, id: selectedUser?.id || 0, email: selectedUser?.email || '', role: selectedUser?.role || ''})} />
            <label>Email</label>
            <Input value={selectedUser?.email || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({...selectedUser, email: e.target.value as string, id: selectedUser?.id || 0, name: selectedUser?.name || '', role: selectedUser?.role || ''})} />
            <label>Role</label>
            <select value={selectedUser?.role || ''} onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value, id: selectedUser?.id || 0, name: selectedUser?.name || '', email: selectedUser?.email || ''})}>
              {roles.map(role => <option key={role} value={role}>{role}</option>)}
            </select>
            <Button type='submit'>Kaydet</Button>
          </form>
        </Dialog>
      </main>
    </>
  );
} 
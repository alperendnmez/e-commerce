import { useState } from 'react';

interface ProductFormProps {
  initialData?: { id?: number; name: string; description: string; price: number; };
  onSubmit: (data: { id?: number; name: string; description: string; price: number; }) => void;
}

export default function ProductForm({ initialData, onSubmit }: ProductFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [price, setPrice] = useState(initialData?.price || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ id: initialData?.id, name, description, price });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div>
        <label className='block text-sm font-medium'>Ürün Adı</label>
        <input
          type='text'
          value={name}
          onChange={(e) => setName(e.target.value)}
          className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm'
          required
        />
      </div>
      <div>
        <label className='block text-sm font-medium'>Açıklama</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm'
          required
        />
      </div>
      <div>
        <label className='block text-sm font-medium'>Fiyat</label>
        <input
          type='number'
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm'
          required
        />
      </div>
      <button type='submit' className='bg-primary text-white p-2 rounded-lg shadow-md'>Kaydet</button>
    </form>
  );
} 
import { format } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Sistem günlüğü türü
export type SystemLog = {
  id: number;
  type: 'ERROR' | 'WARNING' | 'INFO';
  action: string;
  description: string;
  ipAddress: string | null;
  userId: number | null;
  createdAt: string;
  userName?: string;
  userEmail?: string;
};

// Bileşen props türü
interface SystemLogTableProps {
  logs: SystemLog[];
  loading?: boolean;
}

/**
 * Sistem günlük kayıtlarını gösteren tablo bileşeni
 */
export function SystemLogTable({ logs, loading = false }: SystemLogTableProps) {
  // Günlük tipi için uygun renk sınıfı
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ERROR': return 'bg-destructive text-destructive-foreground';
      case 'WARNING': return 'bg-yellow-500 text-black';
      case 'INFO': return 'bg-blue-500 text-white';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };
  
  // Tarih formatla
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy HH:mm:ss', { locale: tr });
  };
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">ID</TableHead>
            <TableHead className="w-[100px]">Tür</TableHead>
            <TableHead className="w-[140px]">İşlem</TableHead>
            <TableHead>Açıklama</TableHead>
            <TableHead className="w-[180px]">Tarih</TableHead>
            <TableHead className="w-[140px]">IP Adresi</TableHead>
            <TableHead className="w-[180px]">Kullanıcı</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-gray-900"></div>
                    <span className="ml-2">Yükleniyor...</span>
                  </div>
                ) : (
                  'Kayıt bulunamadı'
                )}
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.id}</TableCell>
                <TableCell>
                  <Badge className={getTypeColor(log.type)}>
                    {log.type === 'ERROR' ? 'Hata' : 
                     log.type === 'WARNING' ? 'Uyarı' : 'Bilgi'}
                  </Badge>
                </TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell className="max-w-[300px] truncate" title={log.description}>
                  {log.description}
                </TableCell>
                <TableCell>{formatDate(log.createdAt)}</TableCell>
                <TableCell>{log.ipAddress || '-'}</TableCell>
                <TableCell>
                  {log.userName ? (
                    <div className="truncate" title={log.userEmail}>
                      {log.userName}
                      <div className="text-xs text-muted-foreground">
                        {log.userEmail}
                      </div>
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
} 
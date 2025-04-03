# Stok Rezervasyon Sistemi Dökümantasyonu

Bu belge, e-ticaret sisteminde stok rezervasyon mekanizmasının nasıl çalıştığını açıklamaktadır.

## Genel Bakış

Stok rezervasyon sistemi, aşağıdaki senaryoları ele almak üzere tasarlanmıştır:

1. Bir kullanıcı ürünü sepete eklediğinde, belirli bir süre için stok rezerve edilir.
2. Kullanıcı sepetten ürünü çıkardığında rezervasyon iptal edilir.
3. Sipariş tamamlandığında rezervasyon kesinleşir ve stok düşülür.
4. Rezervasyon süresi dolduğunda (kullanıcı ödeme yapmadığında) otomatik olarak iptal edilir.

## Veri Modeli

`StockReservation` modeli Prisma şemasında şu şekilde tanımlanmıştır:

```prisma
model StockReservation {
  id         Int       @id @default(autoincrement())
  variantId  Int
  quantity   Int
  sessionId  String    // Tarayıcı oturumu ID'si
  userId     Int?      // Oturum açan kullanıcı ID'si (opsiyonel)
  status     String    // ACTIVE, COMPLETED, CANCELLED
  createdAt  DateTime  @default(now())
  expiresAt  DateTime  // Rezervasyon sona erme tarihi
  variant    ProductVariant @relation(fields: [variantId], references: [id])
}
```

## Süreç Akışı

### 1. Sepete Ekleme

Bir ürün sepete eklendiğinde:

- `StockService.createReservation()` çağrılır
- İlgili ürün varyantı için stok kontrol edilir
- Stok yeterliyse rezervasyon oluşturulur (30 dakika geçerli)
- Rezervasyon ID'si sepetteki ürün ile ilişkilendirilir

### 2. Sepeti Güncelleme

Sepetteki ürün miktarı değiştirildiğinde:

- Mevcut rezervasyon iptal edilir
- Yeni miktarla yeni rezervasyon oluşturulur
- Yeni rezervasyon ID'si sepetteki ürün ile ilişkilendirilir

### 3. Sepetten Çıkarma

Bir ürün sepetten çıkarıldığında:

- `StockService.cancelReservation()` ile rezervasyon iptal edilir
- Rezervasyon statüsü "CANCELLED" olarak güncellenir

### 4. Sipariş Tamamlama

Sipariş tamamlandığında:

- `StockService.convertReservation()` ile rezervasyonlar sipariş statüsüne dönüştürülür
- Rezervasyon statüsü "COMPLETED" olarak güncellenir
- Ürün stokları düşülür

### 5. Rezervasyon Temizleme

Cron job düzenli olarak çalışarak:

- `/api/cron/cleanup-reservations` endpoint'ine çağrı yapar
- Süresi dolmuş tüm rezervasyonlar iptal edilir

## API Endpoints

- `POST /api/stock/reserve`: Yeni stok rezervasyonu oluşturur
- `POST /api/stock/cancel-reservation`: Var olan rezervasyonu iptal eder
- `POST /api/stock/convert-reservations`: Rezervasyonları tamamlanmış siparişe dönüştürür
- `GET /api/cron/cleanup-reservations`: Süresi dolmuş rezervasyonları temizler

## Güvenlik Önlemleri

- Oturumlu kullanıcılar için sepete eklenen ürünler kullanıcı ID'si ile ilişkilendirilir
- Oturumsuz kullanıcılar için rezervasyonlar tarayıcı oturumu ID'si ile takip edilir
- Cron job'ları API anahtarı doğrulaması ile korunur

## Cron Job Yapılandırması

Süresi dolmuş rezervasyonları temizlemek için `api/cron/cleanup-reservations` her 15 dakikada bir çağrılmalıdır. Örnek cron ifadesi:

```
*/15 * * * * curl -H "x-api-key: YOUR_API_KEY" https://your-domain.com/api/cron/cleanup-reservations
```

## Hata Yönetimi

- Yeterli stok yoksa kullanıcılara uyarı gösterilir
- Ödeme işlemi sırasında ürünün artık mevcut olmadığı durumlar için kontroller bulunur
- API istekleri için hata yakalama ve loglama mekanizmaları eklenmiştir 
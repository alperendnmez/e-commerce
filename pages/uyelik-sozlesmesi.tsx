import { Separator } from '@/components/ui/separator'
import Head from 'next/head'

export default function UyelikSozlesmesi() {
  return (
    <>
      <Head>
        <title>Üyelik Sözleşmesi | Furnico</title>
      </Head>
      <main className="container mx-auto py-12">
        <h1 className="mb-6 text-3xl font-bold">Üyelik Sözleşmesi</h1>
        <Separator className="mb-8" />
        
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Giriş</h2>
            <p>
              Bu Üyelik Sözleşmesi (&quot;Sözleşme&quot;), Furnico e-ticaret platformu (&quot;Platform&quot;) ile ilgili olarak, kullanıcılar (&quot;Üye&quot;) ile Furnico arasındaki hak ve yükümlülükleri düzenlemektedir.
            </p>
          </section>
          
          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Tanımlar</h2>
            <p>
              <strong>Platform:</strong> www.furnico.com alan adı üzerinden erişilebilen web sitesi ve/veya mobil uygulamadır.<br />
              <strong>Üye:</strong> Platform&apos;a kayıt olan ve Platform&apos;u kullanan gerçek veya tüzel kişidir.<br />
              <strong>Hizmet:</strong> Platform üzerinden sunulan tüm ürün ve hizmetlerdir.
            </p>
          </section>
          
          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Üyelik</h2>
            <p>
              3.1. Üyelik işlemi, kayıt formunun doldurulması ve bu Sözleşme&apos;nin kabul edilmesi ile tamamlanır.<br />
              3.2. Üye, kayıt sırasında verdiği bilgilerin doğru, güncel ve eksiksiz olduğunu beyan ve taahhüt eder.<br />
              3.3. Üye, hesap bilgilerinin gizliliğini korumakla ve yetkisiz erişimleri önlemekle yükümlüdür.
            </p>
          </section>
          
          <section>
            <h2 className="mb-3 text-xl font-semibold">4. Kullanım Koşulları</h2>
            <p>
              4.1. Üye, Platform&apos;u yürürlükteki mevzuata, genel ahlak kurallarına ve bu Sözleşme hükümlerine uygun olarak kullanacaktır.<br />
              4.2. Platform&apos;un kötüye kullanımı, yetkisiz erişim girişimleri, hizmet dışı bırakma saldırıları veya diğer zararlı faaliyetler kesinlikle yasaktır.<br />
              4.3. Furnico, herhangi bir Üye&apos;nin hesabını askıya alma veya sonlandırma hakkını saklı tutar.
            </p>
          </section>
          
          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Fikri Mülkiyet Hakları</h2>
            <p>
              5.1. Platform üzerindeki tüm içerik ve materyaller, Furnico&apos;nun veya ilgili lisans sahiplerinin fikri mülkiyetidir.<br />
              5.2. Üyeler, bu içerikleri kopyalama, değiştirme, dağıtma veya ticari amaçlarla kullanma hakkına sahip değildir.
            </p>
          </section>
          
          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Gizlilik</h2>
            <p>
              6.1. Furnico, Üyelerin kişisel verilerini Gizlilik Politikası ve yürürlükteki mevzuat uyarınca işleyecektir.<br />
              6.2. Gizlilik Politikası&apos;na ilişkin detaylı bilgi KVKK Sözleşmesi&apos;nde yer almaktadır.
            </p>
          </section>
          
          <section>
            <h2 className="mb-3 text-xl font-semibold">7. Değişiklikler</h2>
            <p>
              Furnico, bu Sözleşme&apos;nin hükümlerini dilediği zaman değiştirme hakkını saklı tutar. Değişiklikler, Platform üzerinden duyurulacak ve yayınlandığı tarihten itibaren geçerli olacaktır.
            </p>
          </section>
          
          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Sözleşmenin Sona Ermesi</h2>
            <p>
              8.1. Üye, hesabını dilediği zaman kapatarak bu Sözleşme&apos;yi sona erdirebilir.<br />
              8.2. Furnico, Üye&apos;nin bu Sözleşme&apos;yi ihlal etmesi durumunda, Üye&apos;nin hesabını askıya alabilir veya sonlandırabilir.
            </p>
          </section>
          
          <section>
            <h2 className="mb-3 text-xl font-semibold">9. Uygulanacak Hukuk ve Yetkili Mahkemeler</h2>
            <p>
              Bu Sözleşme, Türkiye Cumhuriyeti kanunlarına tabidir. Bu Sözleşme&apos;den doğabilecek her türlü uyuşmazlığın çözümünde Türkiye Cumhuriyeti mahkemeleri yetkilidir.
            </p>
          </section>
        </div>
      </main>
    </>
  )
} 
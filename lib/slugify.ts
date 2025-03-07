// lib/slugify.ts
export const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '') // Harf, rakam, boşluk ve tire hariç karakterleri kaldır
    .replace(/\s+/g, '-') // Boşlukları tireye çevir
    .replace(/-+/g, '-'); // Çoklu tireleri tek tireye indir
};

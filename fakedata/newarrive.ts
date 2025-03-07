import img1 from '../public/fakeImages/featuredProducts/1.jpg'
import img2 from '../public/fakeImages/featuredProducts/2.jpg'
import img3 from '../public/fakeImages/featuredProducts/3.jpg'
import img4 from '../public/fakeImages/featuredProducts/4.jpg'
import img5 from '../public/fakeImages/featuredProducts/5.jpg'

export const newArrive = {
  title: 'Yeni Gelenler',
  href: '',
  products: [
    {
      title: 'Siyah Sandalye Takımı',
      price: '1000',
      discountedPrice: '900',
      discountPrecent: '10',
      isHot: true,
      img: img1,
      slug: 'asd'
    },
    {
      title: 'Masa Lambası',
      price: '2000',
      discountedPrice: '1000',
      discountPrecent: '50',
      isHot: false,
      img: img2,
      slug: 'asd'
    },
    {
      title: 'Renkli Sandalye',
      price: '3500',
      discountedPrice: '700',
      discountPrecent: '80',
      isHot: true,
      img: img3,
      slug: 'asd'
    },
    {
      title: 'Yeşil Sandalye',
      price: '15000',
      discountedPrice: '12000',
      discountPrecent: '20',
      isHot: false,
      img: img4,
      slug: 'asd'
    },
    {
      title: 'Dekor',
      price: '500',
      isHot: true,
      img: img5,
      slug: 'asd'
    }
  ]
}
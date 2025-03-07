import img1 from '../public/fakeImages/bestsellers/1.jpg'
import img2 from '../public/fakeImages/bestsellers/2.jpg'
import img3 from '../public/fakeImages/bestsellers/3.jpg'
import img4 from '../public/fakeImages/bestsellers/4.jpg'
import img5 from '../public/fakeImages/bestsellers/5.jpg'

export const relatedproducts = {
  title: 'İlgili Ürünler',
  href: '',
  relateds: [
    {
      title: 'Siyah Sandalye Takımı',
      price: '1000',
      discountedPrice: '900',
      discountPrecent: '10',
      isHot: true,
      img: img1
    },
    {
      title: 'Sallanan Sandalye',
      price: '2000',
      discountedPrice: '1000',
      discountPrecent: '50',
      isHot: false,
      img: img2
    },
    {
      title: 'Siyah Sandalye',
      price: '3500',
      discountedPrice: '700',
      discountPrecent: '80',
      isHot: true,
      img: img3
    },
    {
      title: 'Vazo',
      price: '15000',
      discountedPrice: '12000',
      discountPrecent: '20',
      isHot: false,
      img: img4
    },
    {
      title: 'Dekor',
      price: '500',
      isHot: true,
      img: img5
    }
  ]
}
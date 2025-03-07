// pages/dashboard/index.tsx
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { getSession } from 'next-auth/react'
import Head from 'next/head'
import { ReactElement } from 'react'

export async function getServerSideProps(context: any) {
  const session = await getSession(context)

  if (!session || session.user.role !== 'ADMIN') {
    return {
      redirect: {
        destination: '/',
        permanent: false
      }
    }
  }

  return {
    props: {}
  }
}

export default function DashboardPage() {
  return (
    <>
      <Head>
        <title>Admin Dashboard | Furnico</title>
      </Head>
      <main className='p-4'>
        <h1 className='text-4xl font-bold'>Admin Dashboard</h1>
        {/* Admin panel içeriği burada */}
      </main>
    </>
  )
}
DashboardPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>
}
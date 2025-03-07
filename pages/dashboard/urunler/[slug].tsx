import DashboardLayout from '@/components/layouts/DashboardLayout'
import React, { ReactElement } from 'react'

function ProductDetailDashboard() {
  return (
    <div>ProductDetailDashboard</div>
  )
}


ProductDetailDashboard.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>
}

export default ProductDetailDashboard
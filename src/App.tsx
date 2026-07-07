import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { I18nProvider } from '@/i18n'
import { AppShell } from '@/components/layout/AppShell'
import { ApprovalInbox } from '@/screens/ApprovalInbox'
import { IntakeDashboard } from '@/screens/IntakeDashboard'
import { RoutingAdmin } from '@/screens/RoutingAdmin'
import { APDashboard } from '@/screens/APDashboard'
import { InvoiceDetail } from '@/screens/InvoiceDetail'

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/inbox" replace />} />
            <Route path="/inbox" element={<ApprovalInbox />} />
            <Route path="/intake" element={<IntakeDashboard />} />
            <Route path="/dashboard" element={<APDashboard />} />
            <Route path="/routing" element={<RoutingAdmin />} />
            <Route path="/invoice/:id" element={<InvoiceDetail />} />
            <Route path="*" element={<Navigate to="/inbox" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  )
}

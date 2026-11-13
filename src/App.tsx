import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ExplorerPage from './pages/ExplorerPage'
import HomePage from './pages/HomePage'
import RiskCheckPage from './pages/RiskCheckPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="explorer" element={<ExplorerPage />} />
        <Route path="risk-check" element={<RiskCheckPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import AskPage from './pages/AskPage'
import ComparePage from './pages/ComparePage'
import ExplorerPage from './pages/ExplorerPage'
import GapsPage from './pages/GapsPage'
import HomePage from './pages/HomePage'
import MethodologyPage from './pages/MethodologyPage'
import RiskCheckPage from './pages/RiskCheckPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="explorer" element={<ExplorerPage />} />
        <Route path="risk-check" element={<RiskCheckPage />} />
        <Route path="ask" element={<AskPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="gaps" element={<GapsPage />} />
        <Route path="methodology" element={<MethodologyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

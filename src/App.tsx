import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ProjectPortfolioPage } from '@/features/portfolio/ProjectPortfolioPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectPortfolioPage />} />
        <Route path="/projects/:projectId" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

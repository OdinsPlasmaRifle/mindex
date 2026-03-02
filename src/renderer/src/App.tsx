import { useEffect } from 'react'
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { api } from './lib/api'
import { showStatus } from './components/StatusToast'
import StatusToast from './components/StatusToast'
import LibrariesPage from './pages/LibrariesPage'
import LibraryComicsPage from './pages/LibraryComicsPage'
import AddLibraryPage from './pages/AddLibraryPage'
import EditLibraryPage from './pages/EditLibraryPage'
import ComicDetailPage from './pages/ComicDetailPage'
import VolumePage from './pages/VolumePage'
import SettingsPage from './pages/SettingsPage'

function useImportStatus(): void {
  useEffect(() => {
    let dismiss: (() => void) | null = null
    const unsubStart = api.onImportStarted(() => {
      dismiss = showStatus('Importing...')
    })
    const unsubEnd = api.onImportFinished(() => {
      dismiss?.()
      dismiss = null
    })
    return () => {
      unsubStart()
      unsubEnd()
      dismiss?.()
    }
  }, [])
}

function NavigateSettingsListener(): React.JSX.Element | null {
  const navigate = useNavigate()
  useEffect(() => {
    return api.onNavigateSettings(() => {
      navigate('/settings')
    })
  }, [navigate])
  return null
}

function NavigateAddLibraryListener(): React.JSX.Element | null {
  const navigate = useNavigate()
  useEffect(() => {
    return api.onNavigateAddLibrary(() => {
      navigate('/library/new')
    })
  }, [navigate])
  return null
}

export default function App(): React.JSX.Element {
  useImportStatus()

  return (
    <HashRouter>
      <NavigateSettingsListener />
      <NavigateAddLibraryListener />
      <Routes>
        <Route path="/" element={<LibrariesPage />} />
        <Route path="/library/new" element={<AddLibraryPage />} />
        <Route path="/library/:id" element={<LibraryComicsPage />} />
        <Route path="/library/:id/edit" element={<EditLibraryPage />} />
        <Route path="/comic/:id" element={<ComicDetailPage />} />
        <Route path="/volume/:id" element={<VolumePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <StatusToast />
    </HashRouter>
  )
}

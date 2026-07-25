import { api } from './api'
import { showError } from '../components/StatusToast'

// Opening a file goes through the OS handler, which can fail for reasons the
// renderer cannot see (missing file, no application registered for .cbz).
// Always surface those instead of appearing to do nothing.
export async function openFile(filePath: string | null): Promise<void> {
  if (!filePath) {
    showError('No file recorded for this item — try refreshing the comic.')
    return
  }
  const result = await api.openFile(filePath)
  if (result?.error) showError(result.error)
}

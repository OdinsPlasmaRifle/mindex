import { contextBridge, ipcRenderer } from 'electron'

const api = {
  onComicsUpdated: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('comics-updated', handler)
    return () => ipcRenderer.removeListener('comics-updated', handler)
  },

  onImportStarted: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('import-started', handler)
    return () => ipcRenderer.removeListener('import-started', handler)
  },

  onImportFinished: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('import-finished', handler)
    return () => ipcRenderer.removeListener('import-finished', handler)
  },

  getComics: (
    libraryId: number,
    page: number,
    search: string,
    pageSize?: number,
    favoritesOnly?: boolean
  ): Promise<{
    comics: Array<{
      id: number
      name: string
      author: string
      image_path: string | null
      directory: string
      favorite: number
      library_id: number
      created_at: string
    }>
    total: number
    page: number
    pageSize: number
  }> => ipcRenderer.invoke('get-comics', libraryId, page, search, pageSize, favoritesOnly),

  getRandomComic: (libraryId: number): Promise<{ id: number } | null> =>
    ipcRenderer.invoke('get-random-comic', libraryId),

  onHiddenContentToggled: (callback: (enabled: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, enabled: boolean): void => callback(enabled)
    ipcRenderer.on('hidden-content-toggled', handler)
    return () => ipcRenderer.removeListener('hidden-content-toggled', handler)
  },

  getHiddenContentEnabled: (): Promise<boolean> =>
    ipcRenderer.invoke('get-hidden-content-enabled'),

  setHiddenContentEnabled: (enabled: boolean): Promise<void> =>
    ipcRenderer.invoke('set-hidden-content-enabled', enabled),

  getComic: (
    id: number
  ): Promise<{
    id: number
    name: string
    author: string
    image_path: string | null
    directory: string
    favorite: number
    library_id: number
    created_at: string
    volumes: Array<{
      id: number
      comic_id: number
      number: number
      directory: string
      file: string | null
      favorite: number
      created_at: string
      chapters: Array<{
        id: number
        volume_id: number
        number: number
        type: 'chapter' | 'extra'
        file: string
        favorite: number
        created_at: string
      }>
    }>
  } | null> => ipcRenderer.invoke('get-comic', id),

  getVolume: (
    id: number
  ): Promise<{
    id: number
    comic_id: number
    number: number
    directory: string
    file: string | null
    favorite: number
    created_at: string
    chapters: Array<{
      id: number
      volume_id: number
      number: number
      type: 'chapter' | 'extra'
      file: string
      favorite: number
      created_at: string
    }>
  } | null> => ipcRenderer.invoke('get-volume', id),

  refreshComic: (id: number): Promise<boolean> =>
    ipcRenderer.invoke('refresh-comic', id),

  toggleFavorite: (id: number): Promise<boolean | null> =>
    ipcRenderer.invoke('toggle-favorite', id),

  toggleVolumeFavorite: (id: number): Promise<boolean | null> =>
    ipcRenderer.invoke('toggle-volume-favorite', id),

  toggleChapterFavorite: (id: number): Promise<boolean | null> =>
    ipcRenderer.invoke('toggle-chapter-favorite', id),

  openFile: (filePath: string): Promise<{ success?: boolean; error?: string }> =>
    ipcRenderer.invoke('open-file', filePath),

  onNavigateSettings: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('navigate-settings', handler)
    return () => ipcRenderer.removeListener('navigate-settings', handler)
  },

  // Source APIs
  getMissingSourcePaths: (libraryId: number): Promise<string[]> =>
    ipcRenderer.invoke('get-missing-source-paths', libraryId),

  pickSourceDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('pick-source-directory'),

  addSource: (path: string, libraryId: number): Promise<{ id: number; imported: number; updated: number }> =>
    ipcRenderer.invoke('add-source', path, libraryId),

  getLibrarySources: (libraryId: number): Promise<Array<{ id: number; path: string; type: string; library_id: number }>> =>
    ipcRenderer.invoke('get-library-sources', libraryId),

  checkLibrarySourcesExist: (libraryId: number): Promise<Array<{ id: number; path: string; type: string; library_id: number; exists: boolean }>> =>
    ipcRenderer.invoke('check-library-sources-exist', libraryId),

  checkAllSourcesExist: (): Promise<Array<{ id: number; path: string; type: string; library_id: number | null; exists: boolean }>> =>
    ipcRenderer.invoke('check-all-sources-exist'),

  updateSourcePath: (id: number): Promise<boolean> =>
    ipcRenderer.invoke('update-source-path', id),

  refreshSource: (id: number): Promise<{ imported: number; updated: number } | null> =>
    ipcRenderer.invoke('refresh-source', id),

  clearSource: (id: number): Promise<boolean> =>
    ipcRenderer.invoke('clear-source', id),

  // Library APIs
  createLibrary: (opts: { name: string; description?: string; mediaType?: string; imagePath?: string; isHidden?: boolean }, sourcePaths?: string[]): Promise<{ id: number; sourceResults?: Array<{ path: string; imported: number; updated: number }> }> =>
    ipcRenderer.invoke('create-library', opts, sourcePaths),

  pickLibraryImage: (): Promise<string | null> =>
    ipcRenderer.invoke('pick-library-image'),

  getLibraries: (search?: string, hiddenFilter?: 'hide' | 'include' | 'only'): Promise<Array<{
    id: number; name: string; description: string | null; media_type: string; image_path: string | null; is_hidden: number; created_at: string; comic_count: number
  }>> =>
    ipcRenderer.invoke('get-libraries', search, hiddenFilter),

  getLibrary: (id: number): Promise<{
    id: number; name: string; description: string | null; media_type: string; image_path: string | null; is_hidden: number; created_at: string; comic_count: number
  } | null> =>
    ipcRenderer.invoke('get-library', id),

  updateLibrary: (id: number, opts: { name?: string; description?: string; imagePath?: string | null; isHidden?: boolean }): Promise<boolean> =>
    ipcRenderer.invoke('update-library', id, opts),

  deleteLibrary: (id: number): Promise<boolean> =>
    ipcRenderer.invoke('delete-library', id),

  onNavigateAddLibrary: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('navigate-add-library', handler)
    return () => ipcRenderer.removeListener('navigate-add-library', handler)
  },

  clearAllData: (): Promise<void> =>
    ipcRenderer.invoke('clear-all-data')
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api

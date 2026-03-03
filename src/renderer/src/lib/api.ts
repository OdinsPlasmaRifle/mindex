import type { ComicsPage, ComicWithVolumes, VolumeWithChapters, LibraryWithCount, Source, SourceWithStatus } from '../types'

declare global {
  interface Window {
    api: {
      onComicsUpdated(callback: () => void): () => void
      onImportStarted(callback: () => void): () => void
      onImportFinished(callback: () => void): () => void
      getComics(libraryId: number, page: number, search: string, pageSize?: number, favoritesOnly?: boolean): Promise<ComicsPage>
      getRandomComic(libraryId: number): Promise<{ id: number } | null>
      getComic(id: number): Promise<ComicWithVolumes | null>
      getVolume(id: number): Promise<VolumeWithChapters | null>
      refreshComic(id: number): Promise<boolean>
      toggleFavorite(id: number): Promise<boolean | null>
      toggleVolumeFavorite(id: number): Promise<boolean | null>
      toggleChapterFavorite(id: number): Promise<boolean | null>
      openFile(filePath: string): Promise<{ success?: boolean; error?: string }>
      onHiddenContentToggled(callback: (enabled: boolean) => void): () => void
      getHiddenContentEnabled(): Promise<boolean>
      setHiddenContentEnabled(enabled: boolean): Promise<void>
      onNavigateSettings(callback: () => void): () => void
      getMissingSourcePaths(libraryId: number): Promise<string[]>
      pickSourceDirectory(): Promise<string | null>
      addSource(path: string, libraryId: number): Promise<{ id: number; imported: number; updated: number }>
      getLibrarySources(libraryId: number): Promise<Source[]>
      checkLibrarySourcesExist(libraryId: number): Promise<SourceWithStatus[]>
      checkAllSourcesExist(): Promise<Array<SourceWithStatus & { library_id: number | null }>>
      updateSourcePath(id: number): Promise<boolean>
      refreshSource(id: number): Promise<{ imported: number; updated: number } | null>
      clearSource(id: number): Promise<boolean>
      createLibrary(opts: { name: string; description?: string; mediaType?: string; imagePath?: string; isHidden?: boolean }, sourcePaths?: string[]): Promise<{ id: number; sourceResults?: Array<{ path: string; imported: number; updated: number }> }>
      pickLibraryImage(): Promise<string | null>
      getLibraries(search?: string, hiddenFilter?: 'hide' | 'include' | 'only'): Promise<LibraryWithCount[]>
      getLibrary(id: number): Promise<LibraryWithCount | null>
      updateLibrary(id: number, opts: { name?: string; description?: string; imagePath?: string | null; isHidden?: boolean }): Promise<boolean>
      deleteLibrary(id: number): Promise<boolean>
      onNavigateAddLibrary(callback: () => void): () => void
      clearAllData(): Promise<void>
    }
  }
}

export const api = window.api

export function localFileUrl(filePath: string): string {
  return 'local-file:///' + encodeURIComponent(filePath).replace(/%2F/g, '/').replace(/%5C/g, '/')
}

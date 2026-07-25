export interface Library {
  id: number
  name: string
  description: string | null
  media_type: string
  image_path: string | null
  is_hidden: number
  created_at: string
}

export interface LibraryWithCount extends Library {
  comic_count: number
}

export interface Comic {
  id: number
  name: string
  author: string
  image_path: string | null
  directory: string
  favorite: number
  library_id: number
  created_at: string
}

export interface Volume {
  id: number
  comic_id: number
  number: number
  directory: string
  file: string | null
  favorite: number
  created_at: string
}

export interface Chapter {
  id: number
  volume_id: number
  number: number
  increment: string
  type: 'chapter' | 'extra'
  file: string
  favorite: number
  created_at: string
}

export interface VolumeWithChapters extends Volume {
  chapters: Chapter[]
  library_is_hidden: number
}

export interface ComicWithVolumes extends Comic {
  volumes: VolumeWithChapters[]
  library_is_hidden: number
}

export interface ComicsPage {
  comics: Comic[]
  total: number
  page: number
  pageSize: number
}

export interface Source {
  id: number
  path: string
  type: string
  library_id: number
}

export interface SourceWithStatus extends Source {
  exists: boolean
}

export type TagResource = 'comics'
export type TagLevel = 'comic' | 'volume' | 'chapter'

export interface Tag {
  id: number
  name: string
  resource: TagResource
  is_hidden: number
}

/** A tag plus how many comics reference it at any level (comic/volume/chapter). */
export interface TagWithCount extends Tag {
  comic_count: number
}

export interface TagSummary {
  id: number
  name: string
  is_hidden: number
}

export interface TagWithSource {
  id: number
  name: string
  is_hidden: number
  direct: 0 | 1
  count: number
}

export type TagFilterState = 'included' | 'excluded'

export type ComicSortBy = 'added' | 'name' | 'author'
export type SortDir = 'asc' | 'desc'

export interface ComicSort {
  by: ComicSortBy
  dir: SortDir
}

export const DEFAULT_COMIC_SORT: ComicSort = { by: 'name', dir: 'asc' }

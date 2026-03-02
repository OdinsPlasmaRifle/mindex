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
  created_at: string
}

export interface Chapter {
  id: number
  volume_id: number
  number: number
  type: 'chapter' | 'extra'
  file: string
  created_at: string
}

export interface VolumeWithChapters extends Volume {
  chapters: Chapter[]
}

export interface ComicWithVolumes extends Comic {
  volumes: VolumeWithChapters[]
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

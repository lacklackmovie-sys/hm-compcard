import type { Project, UserTemplate } from './types'

const DB = 'hm-compcard'
let dbp: Promise<IDBDatabase> | null = null
function open(): Promise<IDBDatabase> {
  if (dbp) return dbp
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => {
      const d = r.result
      d.createObjectStore('projects', { keyPath: 'id' })
      d.createObjectStore('templates', { keyPath: 'id' })
      const ph = d.createObjectStore('photos', { keyPath: 'id' })
      ph.createIndex('projectId', 'projectId')
      d.createObjectStore('kv')
    }
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
  return dbp
}
function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return open().then(
    (d) =>
      new Promise<T>((res, rej) => {
        const t = d.transaction(store, mode)
        const rq = fn(t.objectStore(store))
        t.oncomplete = () => res(rq ? (rq.result as T) : (undefined as T))
        t.onerror = () => rej(t.error)
        t.onabort = () => rej(t.error)
      }),
  )
}

export const saveProject = (p: Project) => tx('projects', 'readwrite', (s) => { s.put(p) })
export const getProject = (id: string) => tx<Project | undefined>('projects', 'readonly', (s) => s.get(id))
export const listProjects = () => tx<Project[]>('projects', 'readonly', (s) => s.getAll())
export async function deleteProject(id: string) {
  await tx('projects', 'readwrite', (s) => { s.delete(id) })
  const d = await open()
  await new Promise<void>((res, rej) => {
    const t = d.transaction('photos', 'readwrite')
    const idx = t.objectStore('photos').index('projectId')
    const rq = idx.openKeyCursor(IDBKeyRange.only(id))
    rq.onsuccess = () => {
      const c = rq.result
      if (c) { t.objectStore('photos').delete(c.primaryKey); c.continue() }
    }
    t.oncomplete = () => res()
    t.onerror = () => rej(t.error)
  })
}

export interface PhotoRec { id: string; projectId: string; blob: Blob }
export const putPhoto = (r: PhotoRec) => tx('photos', 'readwrite', (s) => { s.put(r) })
export const getPhoto = (id: string) => tx<PhotoRec | undefined>('photos', 'readonly', (s) => s.get(id))
export const delPhoto = (id: string) => tx('photos', 'readwrite', (s) => { s.delete(id) })
export async function copyPhotos(fromProject: string, toProject: string, idMap: Map<string, string>) {
  for (const [a, b] of idMap) {
    const r = await getPhoto(a)
    if (r) await putPhoto({ id: b, projectId: toProject, blob: r.blob })
  }
}

export const saveTemplate = (t: UserTemplate) => tx('templates', 'readwrite', (s) => { s.put(t) })
export const listTemplates = () => tx<UserTemplate[]>('templates', 'readonly', (s) => s.getAll())
export const deleteTemplate = (id: string) => tx('templates', 'readwrite', (s) => { s.delete(id) })

export const kvGet = <T,>(k: string) => tx<T | undefined>('kv', 'readonly', (s) => s.get(k))
export const kvSet = (k: string, v: unknown) => tx('kv', 'readwrite', (s) => { s.put(v, k) })

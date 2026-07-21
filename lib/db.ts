import Datastore from '@seald-io/nedb'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')

function createStore(filename: string) {
  return new Datastore({
    filename: path.join(DATA_DIR, filename),
    autoload: true,
    timestampData: false,
  })
}

declare global {
  // eslint-disable-next-line no-var
  var __db: {
    users: Datastore
    members: Datastore
    events: Datastore
    eventTypes: Datastore
    auditLog: Datastore
  } | undefined
}

function getDb() {
  if (!global.__db) {
    global.__db = {
      users: createStore('users.db'),
      members: createStore('members.db'),
      events: createStore('events.db'),
      eventTypes: createStore('event-types.db'),
      auditLog: createStore('audit-log.db'),
    }
  }
  return global.__db
}

export const db = getDb()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>

export function dbFindOne<T>(store: Datastore, query: Doc): Promise<T | null> {
  return new Promise((res) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store.findOne(query, (err: any, doc: any) => res(err ? null : (doc as T | null)))
  )
}

export function dbFind<T>(store: Datastore, query: Doc): Promise<T[]> {
  return new Promise((res) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store.find(query, (err: any, docs: any[]) => res(err ? [] : (docs as T[])))
  )
}

export function dbInsert<T>(store: Datastore, doc: Doc): Promise<T> {
  return new Promise((res, rej) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store.insert(doc, (err: any, newDoc: any) => (err ? rej(err) : res(newDoc as T)))
  )
}

export function dbUpdate(store: Datastore, query: Doc, update: Doc): Promise<void> {
  return new Promise((res, rej) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store.update(query, { $set: update }, {}, (err: any) => (err ? rej(err) : res()))
  )
}

export function dbRemove(store: Datastore, query: Doc): Promise<void> {
  return new Promise((res, rej) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store.remove(query, {}, (err: any) => (err ? rej(err) : res()))
  )
}

export function dbRemoveMany(store: Datastore, query: Doc): Promise<number> {
  return new Promise((res, rej) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store.remove(query, { multi: true }, (err: any, n: number) => (err ? rej(err) : res(n)))
  )
}

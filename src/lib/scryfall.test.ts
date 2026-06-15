import { describe, expect, it, vi } from 'vitest'
import {
  clearLocalStorageScryfallCache,
  createLocalStorageScryfallCache,
  fetchPrintingsForDeck,
  type ScryfallCache,
} from './scryfall'
import type { ScryfallPrinting } from './types'

const cachedPrinting: ScryfallPrinting = {
  id: 'sol-ring-cache',
  name: 'Sol Ring',
  artist: 'Mark Tedin',
  setCode: 'me4',
  setName: 'Masters Edition IV',
  collectorNumber: '227',
  scryfallUri: 'https://scryfall.com/card/me4/227/sol-ring',
}

const apiPrinting: ScryfallPrinting = {
  ...cachedPrinting,
  id: 'sol-ring-api',
  imageUri: undefined,
}

describe('fetchPrintingsForDeck', () => {
  it('uses cached printings without calling Scryfall', async () => {
    const cache: ScryfallCache = {
      get: vi.fn(() => [cachedPrinting]),
      set: vi.fn(),
    }
    const fetcher = vi.fn() as unknown as typeof fetch

    const result = await fetchPrintingsForDeck(
      [{ name: 'Sol Ring', quantity: 1 }],
      undefined,
      fetcher,
      cache,
    )

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.printingsByName.get('sol ring')).toEqual([cachedPrinting])
    expect(cache.set).not.toHaveBeenCalled()
  })

  it('stores fetched printings in the cache', async () => {
    const cache: ScryfallCache = {
      get: vi.fn(() => undefined),
      set: vi.fn(),
    }
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        has_more: false,
        data: [
          {
            id: 'sol-ring-api',
            name: 'Sol Ring',
            artist: 'Mark Tedin',
            set: 'me4',
            set_name: 'Masters Edition IV',
            collector_number: '227',
            scryfall_uri: 'https://scryfall.com/card/me4/227/sol-ring',
          },
        ],
      }),
    })) as unknown as typeof fetch

    const result = await fetchPrintingsForDeck(
      [{ name: 'Sol Ring', quantity: 1 }],
      undefined,
      fetcher,
      cache,
    )

    expect(result.printingsByName.get('sol ring')).toEqual([apiPrinting])
    expect(cache.set).toHaveBeenCalledWith('sol ring', [apiPrinting])
  })

  it('reuses one lookup for duplicate card names in the same deck check', async () => {
    const cache: ScryfallCache = {
      get: vi.fn(() => undefined),
      set: vi.fn(),
    }
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        has_more: false,
        data: [
          {
            id: 'sol-ring-api',
            name: 'Sol Ring',
            artist: 'Mark Tedin',
            set: 'me4',
            set_name: 'Masters Edition IV',
            collector_number: '227',
            scryfall_uri: 'https://scryfall.com/card/me4/227/sol-ring',
          },
        ],
      }),
    })) as unknown as typeof fetch

    const result = await fetchPrintingsForDeck(
      [
        {
          name: 'Sol Ring',
          quantity: 1,
          printing: { setCode: 'ME4', collectorNumber: '227' },
        },
        {
          name: 'Sol Ring',
          quantity: 1,
          printing: { setCode: 'CMM', collectorNumber: '400' },
        },
      ],
      undefined,
      fetcher,
      cache,
    )

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result.printingsByName.get('sol ring')).toEqual([apiPrinting])
    expect(cache.set).toHaveBeenCalledTimes(1)
  })

  it('spaces uncached Scryfall search requests to respect the search rate limit', async () => {
    vi.useFakeTimers()

    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({ has_more: false, data: [] }),
    })) as unknown as typeof fetch
    const lookup = fetchPrintingsForDeck(
      [
        { name: 'Sol Ring', quantity: 1 },
        { name: 'Counterspell', quantity: 1 },
      ],
      undefined,
      fetcher,
    )

    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    await vi.advanceTimersByTimeAsync(499)
    expect(fetcher).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    await lookup

    expect(fetcher).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe('createLocalStorageScryfallCache', () => {
  it('stores printings with a namespaced key', () => {
    const storage = createMemoryStorage()
    const cache = createLocalStorageScryfallCache(storage)

    cache.set('sol ring', [cachedPrinting])

    expect(cache.get('sol ring')).toEqual([cachedPrinting])
    expect(storage.getItem('card-artist-tracker:scryfall:sol ring')).toContain(
      'sol-ring-cache',
    )
  })

  it('clears only Scryfall cache entries', () => {
    const storage = createMemoryStorage()
    const cache = createLocalStorageScryfallCache(storage)

    cache?.set('sol ring', [cachedPrinting])
    storage.setItem('card-artist-tracker:preferences', '{}')

    clearLocalStorageScryfallCache(storage)

    expect(storage.getItem('card-artist-tracker:scryfall:sol ring')).toBeNull()
    expect(storage.getItem('card-artist-tracker:preferences')).toBe('{}')
  })
})

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

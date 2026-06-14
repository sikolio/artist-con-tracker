import { describe, expect, it } from 'vitest'
import { loadAppPreferences, saveAppPreferences } from './preferences'

describe('app preferences', () => {
  it('round trips decklist, exact mode, and selected convention', () => {
    const storage = createMemoryStorage()

    saveAppPreferences(
      {
        decklist: '1 Sol Ring',
        exactPrintingMode: true,
        selectedConventionId: 'scg-con-las-vegas-2026',
      },
      storage,
    )

    expect(loadAppPreferences(storage)).toEqual({
      decklist: '1 Sol Ring',
      exactPrintingMode: true,
      selectedConventionId: 'scg-con-las-vegas-2026',
    })
  })

  it('returns empty preferences for malformed storage', () => {
    const storage = createMemoryStorage()

    storage.setItem('card-artist-tracker:preferences', 'nope')

    expect(loadAppPreferences(storage)).toEqual({})
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

export type AppPreferences = {
  decklist: string
  exactPrintingMode: boolean
  selectedConventionId: string
  version: number
}

export const currentPreferencesVersion = 2

const preferencesKey = 'card-artist-tracker:preferences'

export function loadAppPreferences(
  storage = getBrowserStorage(),
): Partial<AppPreferences> {
  if (!storage) {
    return {}
  }

  try {
    const rawValue = storage.getItem(preferencesKey)

    if (!rawValue) {
      return {}
    }

    const parsed = JSON.parse(rawValue) as Partial<AppPreferences>

    return {
      decklist: typeof parsed.decklist === 'string' ? parsed.decklist : undefined,
      exactPrintingMode:
        typeof parsed.exactPrintingMode === 'boolean'
          ? parsed.exactPrintingMode
          : undefined,
      selectedConventionId:
        typeof parsed.selectedConventionId === 'string'
          ? parsed.selectedConventionId
          : undefined,
      version: typeof parsed.version === 'number' ? parsed.version : undefined,
    }
  } catch {
    storage.removeItem(preferencesKey)
    return {}
  }
}

export function migrateAppPreferences(
  preferences: Partial<AppPreferences>,
  options: {
    currentSampleDecklist: string
    legacySampleDecklists: string[]
  },
): Partial<AppPreferences> {
  if (preferences.version === currentPreferencesVersion) {
    return preferences
  }

  const bundledSamples = new Set(
    [options.currentSampleDecklist, ...options.legacySampleDecklists].map(
      normalizeDecklistForComparison,
    ),
  )
  const savedDecklist =
    typeof preferences.decklist === 'string' ? preferences.decklist : undefined

  if (savedDecklist && bundledSamples.has(normalizeDecklistForComparison(savedDecklist))) {
    return {
      decklist: options.currentSampleDecklist,
      selectedConventionId: preferences.selectedConventionId,
      version: currentPreferencesVersion,
    }
  }

  return {
    ...preferences,
    version: currentPreferencesVersion,
  }
}

export function saveAppPreferences(
  preferences: Omit<AppPreferences, 'version'> | AppPreferences,
  storage = getBrowserStorage(),
) {
  if (!storage) {
    return
  }

  try {
    storage.setItem(
      preferencesKey,
      JSON.stringify({
        ...preferences,
        version: currentPreferencesVersion,
      }),
    )
  } catch {
    // Preferences are best-effort; losing them should not block deck lookup.
  }
}

function normalizeDecklistForComparison(decklist: string) {
  return decklist.trim().replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '')
}

function getBrowserStorage() {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

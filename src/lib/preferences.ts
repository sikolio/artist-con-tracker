export type AppPreferences = {
  decklist: string
  exactPrintingMode: boolean
  selectedConventionId: string
}

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
    }
  } catch {
    storage.removeItem(preferencesKey)
    return {}
  }
}

export function saveAppPreferences(
  preferences: AppPreferences,
  storage = getBrowserStorage(),
) {
  if (!storage) {
    return
  }

  try {
    storage.setItem(preferencesKey, JSON.stringify(preferences))
  } catch {
    // Preferences are best-effort; losing them should not block deck lookup.
  }
}

function getBrowserStorage() {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

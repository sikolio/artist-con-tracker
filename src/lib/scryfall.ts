import { normalizeCardName } from './decklist'
import type { DeckEntry, LookupResult, ScryfallPrinting } from './types'

type Fetcher = typeof fetch

export type ScryfallCache = {
  get: (normalizedCardName: string) => ScryfallPrinting[] | undefined
  set: (normalizedCardName: string, printings: ScryfallPrinting[]) => void
}

const scryfallCachePrefix = 'card-artist-tracker:scryfall:'

export function createLocalStorageScryfallCache(
  storage = getBrowserStorage(),
): ScryfallCache | undefined {
  if (!storage) {
    return undefined
  }

  return {
    get: (normalizedCardName) => {
      const itemKey = `${scryfallCachePrefix}${normalizedCardName}`
      const rawValue = storage.getItem(itemKey)

      if (!rawValue) {
        return undefined
      }

      try {
        const parsed = JSON.parse(rawValue) as ScryfallPrinting[]
        return Array.isArray(parsed) ? parsed : undefined
      } catch {
        storage.removeItem(itemKey)
        return undefined
      }
    },
    set: (normalizedCardName, printings) => {
      try {
        storage.setItem(
          `${scryfallCachePrefix}${normalizedCardName}`,
          JSON.stringify(printings),
        )
      } catch {
        // Storage can be unavailable or full; network lookup remains the fallback.
      }
    },
  }
}

export function clearLocalStorageScryfallCache(storage = getBrowserStorage()) {
  if (!storage) {
    return
  }

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index)

    if (key?.startsWith(scryfallCachePrefix)) {
      storage.removeItem(key)
    }
  }
}

type ScryfallCard = {
  id: string
  name: string
  artist?: string
  set: string
  set_name: string
  collector_number: string
  scryfall_uri: string
  image_uris?: {
    small?: string
    normal?: string
  }
  card_faces?: Array<{
    artist?: string
    image_uris?: {
      small?: string
      normal?: string
    }
  }>
}

type ScryfallSearchResponse = {
  data: ScryfallCard[]
  has_more: boolean
  next_page?: string
}

export async function fetchPrintingsForDeck(
  deck: DeckEntry[],
  signal?: AbortSignal,
  fetcher: Fetcher = fetch,
  cache?: ScryfallCache,
): Promise<LookupResult> {
  const printingsByName = new Map<string, ScryfallPrinting[]>()
  const missingCards: string[] = []

  for (const entry of deck) {
    const key = normalizeCardName(entry.name)
    const cachedPrintings = cache?.get(key)

    if (cachedPrintings) {
      printingsByName.set(key, cachedPrintings)
      continue
    }

    try {
      const printings = await fetchPrintingsForCard(entry.name, signal, fetcher)
      printingsByName.set(key, printings)
      cache?.set(key, printings)
    } catch {
      missingCards.push(entry.name)
      printingsByName.set(key, [])
    }
  }

  return { printingsByName, missingCards }
}

async function fetchPrintingsForCard(
  cardName: string,
  signal?: AbortSignal,
  fetcher: Fetcher = fetch,
) {
  const query = `!"${cardName.replace(/"/g, '\\"')}" unique:prints`
  const url = new URL('https://api.scryfall.com/cards/search')
  url.searchParams.set('q', query)

  const cards = await fetchAllPages(url.toString(), signal, fetcher)
  return cards.map(toPrinting).filter((printing) => printing.artist)
}

async function fetchAllPages(
  firstUrl: string,
  signal: AbortSignal | undefined,
  fetcher: Fetcher,
) {
  const cards: ScryfallCard[] = []
  let nextUrl: string | undefined = firstUrl

  while (nextUrl) {
    const response = await fetcher(nextUrl, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Scryfall request failed with ${response.status}`)
    }

    const payload = (await response.json()) as ScryfallSearchResponse
    cards.push(...payload.data)
    nextUrl = payload.has_more ? payload.next_page : undefined
  }

  return cards
}

function toPrinting(card: ScryfallCard): ScryfallPrinting {
  const faceArtists = card.card_faces
    ?.map((face) => face.artist)
    .filter((artist): artist is string => Boolean(artist))
  const artist = card.artist ?? faceArtists?.join(' & ') ?? ''
  const imageUri =
    card.image_uris?.normal ??
    card.image_uris?.small ??
    card.card_faces?.[0]?.image_uris?.normal ??
    card.card_faces?.[0]?.image_uris?.small

  return {
    id: card.id,
    name: card.name,
    artist,
    setCode: card.set,
    setName: card.set_name,
    collectorNumber: card.collector_number,
    scryfallUri: card.scryfall_uri,
    imageUri,
  }
}

function getBrowserStorage() {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

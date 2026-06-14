export type DeckEntry = {
  name: string
  quantity: number
  printing?: PrintingHint
}

export type PrintingHint = {
  setCode: string
  collectorNumber: string
}

export type Convention = {
  id: string
  name: string
  dateRange: string
  location: string
  sourceUrl: string
  artists: string[]
  artistProfiles?: Record<string, ArtistProfile>
}

export type ArtistProfile = {
  booth?: string
  schedule?: string
  signingFee?: string
  alterSketchPolicy?: string
  sourceUrl?: string
}

export type ScryfallPrinting = {
  id: string
  name: string
  artist: string
  setCode: string
  setName: string
  collectorNumber: string
  scryfallUri: string
  imageUri?: string
}

export type SignableCard = {
  cardName: string
  quantity: number
  matchType: 'any-printing' | 'exact-printing' | 'alternate-printing'
  requestedPrinting?: PrintingHint
  artists: string[]
  printings: ScryfallPrinting[]
}

export type LookupResult = {
  printingsByName: Map<string, ScryfallPrinting[]>
  missingCards: string[]
}

import { normalizeCardName } from './decklist'
import type { DeckEntry, ScryfallPrinting, SignableCard } from './types'

export function findSignableCards(
  deck: DeckEntry[],
  printingsByName: Map<string, ScryfallPrinting[]>,
  attendingArtists: string[],
  options: { exactMode?: boolean } = {},
): SignableCard[] {
  const attendingKeys = new Set(attendingArtists.map(normalizeArtistName))

  return deck.flatMap((entry) => {
    const printings = printingsByName.get(normalizeCardName(entry.name)) ?? []
    const matchingPrintings = printings.filter((printing) =>
      artistCreditMatches(printing.artist, attendingKeys),
    )

    if (matchingPrintings.length === 0) {
      return []
    }

    const exactPrintings =
      options.exactMode && entry.printing
        ? matchingPrintings.filter((printing) => printingMatchesHint(printing, entry.printing))
        : []
    const hasExactRequest = Boolean(options.exactMode && entry.printing)
    const resultPrintings = exactPrintings.length > 0 ? exactPrintings : matchingPrintings
    const matchType = hasExactRequest
      ? exactPrintings.length > 0
        ? 'exact-printing'
        : 'alternate-printing'
      : 'any-printing'

    return [
      {
        cardName: entry.name,
        quantity: entry.quantity,
        requestedPrinting: entry.printing,
        matchType,
        artists: unique(resultPrintings.map((printing) => printing.artist)),
        printings: resultPrintings,
      },
    ]
  })
}

export function findMatchedAttendingArtists(
  signableCards: SignableCard[],
  attendingArtists: string[],
) {
  const matchedCredits = signableCards.flatMap((card) => card.artists)

  return attendingArtists.filter((artist) =>
    matchedCredits.some((credit) => artistCreditMatches(credit, new Set([normalizeArtistName(artist)]))),
  )
}

export function getArtistSigningCards(
  signableCards: SignableCard[],
  artist: string,
) {
  const artistKey = new Set([normalizeArtistName(artist)])

  return signableCards.filter((card) =>
    card.artists.some((credit) => artistCreditMatches(credit, artistKey)),
  )
}

export function groupSignableCardsByArtist(
  signableCards: SignableCard[],
  attendingArtists: string[],
) {
  return attendingArtists
    .map((artist) => ({
      artist,
      cards: getArtistSigningCards(signableCards, artist),
    }))
    .filter((group) => group.cards.length > 0)
}

export function normalizeArtistName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function artistCreditMatches(artistCredit: string, attendingKeys: Set<string>) {
  const normalizedCredit = normalizeArtistName(artistCredit)

  if (attendingKeys.has(normalizedCredit)) {
    return true
  }

  const artistParts = artistCredit.split(/\s+(?:&|and)\s+/i).map(normalizeArtistName)
  return artistParts.some((artist) => attendingKeys.has(artist))
}

function printingMatchesHint(
  printing: ScryfallPrinting,
  hint: NonNullable<DeckEntry['printing']>,
) {
  return (
    printing.setCode.toLowerCase() === hint.setCode.toLowerCase() &&
    printing.collectorNumber.toLowerCase() === hint.collectorNumber.toLowerCase()
  )
}

function unique(values: string[]) {
  return [...new Set(values)]
}

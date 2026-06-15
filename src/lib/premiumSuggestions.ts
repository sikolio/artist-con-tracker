import { normalizeCardName } from './decklist'
import { findSignableCards } from './matching'
import type { Convention, DeckEntry, ScryfallPrinting, SignableCard } from './types'

export type PremiumConventionSuggestion = {
  conventionId: string
  conventionName: string
  dateRange: string
  location: string
  coveredCards: {
    cardName: string
    artists: string[]
  }[]
}

export function buildPremiumConventionSuggestions({
  deck,
  printingsByName,
  currentSignableCards,
  conventions,
  selectedConventionId,
  exactMode,
}: {
  deck: DeckEntry[]
  printingsByName: Map<string, ScryfallPrinting[]>
  currentSignableCards: SignableCard[]
  conventions: Convention[]
  selectedConventionId: string
  exactMode?: boolean
}): PremiumConventionSuggestion[] {
  const currentMatchedCards = new Set(
    currentSignableCards.map((card) => normalizeCardName(card.cardName)),
  )
  const missedDeck = deck.filter(
    (entry) => !currentMatchedCards.has(normalizeCardName(entry.name)),
  )

  if (missedDeck.length === 0) {
    return []
  }

  return conventions
    .filter((convention) => convention.id !== selectedConventionId)
    .map((convention) => {
      const signableCards = findSignableCards(
        missedDeck,
        printingsByName,
        convention.artists,
        { exactMode },
      )

      return {
        conventionId: convention.id,
        conventionName: convention.name,
        dateRange: convention.dateRange,
        location: convention.location,
        coveredCards: signableCards.map((card) => ({
          cardName: card.cardName,
          artists: card.artists,
        })),
      }
    })
    .filter((suggestion) => suggestion.coveredCards.length > 0)
    .sort((first, second) => second.coveredCards.length - first.coveredCards.length)
    .slice(0, 3)
}

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

export type PremiumSuggestionTeaser = {
  visibleSuggestion: {
    conventionId: string
    conventionName: string
    dateRange: string
    location: string
    coveredCard: {
      cardName: string
      artists: string[]
    }
  }
  lockedMatchCount: number
  lockedConventionCount: number
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

export function buildPremiumSuggestionTeaser(
  suggestions: PremiumConventionSuggestion[],
): PremiumSuggestionTeaser | null {
  const visibleSuggestion = suggestions[0]
  const visibleCard = visibleSuggestion?.coveredCards[0]

  if (!visibleSuggestion || !visibleCard) {
    return null
  }

  let lockedMatchCount = 0

  suggestions.forEach((suggestion, suggestionIndex) => {
    suggestion.coveredCards.forEach((_card, cardIndex) => {
      const isVisibleCard = suggestionIndex === 0 && cardIndex === 0

      if (!isVisibleCard) {
        lockedMatchCount += 1
      }
    })
  })

  return {
    visibleSuggestion: {
      conventionId: visibleSuggestion.conventionId,
      conventionName: visibleSuggestion.conventionName,
      dateRange: visibleSuggestion.dateRange,
      location: visibleSuggestion.location,
      coveredCard: visibleCard,
    },
    lockedMatchCount,
    lockedConventionCount: Math.max(suggestions.length - 1, 0),
  }
}

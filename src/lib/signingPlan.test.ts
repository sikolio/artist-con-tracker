import { describe, expect, it } from 'vitest'
import { buildSigningPlan } from './signingPlan'
import type { SignableCard } from './types'

const cards: SignableCard[] = [
  {
    cardName: 'Sol Ring',
    quantity: 1,
    matchType: 'exact-printing',
    artists: ['Mark Tedin'],
    printings: [],
  },
  {
    cardName: 'Counterspell',
    quantity: 2,
    matchType: 'alternate-printing',
    artists: ['Ken Meyer, Jr.'],
    printings: [],
  },
  {
    cardName: 'Ponder',
    quantity: 1,
    matchType: 'any-printing',
    artists: ['Mark Tedin'],
    printings: [],
  },
]

describe('buildSigningPlan', () => {
  it('separates cards the player can bring from cards that need another printing', () => {
    expect(buildSigningPlan(cards)).toEqual({
      bringCards: [cards[0], cards[2]],
      findAlternateCards: [cards[1]],
      bringQuantity: 2,
      findAlternateQuantity: 2,
    })
  })
})

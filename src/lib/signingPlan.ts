import type { SignableCard } from './types'

export type SigningPlan = {
  bringCards: SignableCard[]
  findAlternateCards: SignableCard[]
  bringQuantity: number
  findAlternateQuantity: number
}

export function buildSigningPlan(signableCards: SignableCard[]): SigningPlan {
  const bringCards = signableCards.filter(
    (card) => card.matchType !== 'alternate-printing',
  )
  const findAlternateCards = signableCards.filter(
    (card) => card.matchType === 'alternate-printing',
  )

  return {
    bringCards,
    findAlternateCards,
    bringQuantity: sumQuantities(bringCards),
    findAlternateQuantity: sumQuantities(findAlternateCards),
  }
}

function sumQuantities(cards: SignableCard[]) {
  return cards.reduce((total, card) => total + card.quantity, 0)
}

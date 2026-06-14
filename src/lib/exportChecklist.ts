import type { SignableCard } from './types'

export type ChecklistGroup = {
  artist: string
  cards: SignableCard[]
}

export function buildChecklistCsv(groups: ChecklistGroup[]) {
  const rows = [
    ['Artist', 'Card', 'Quantity', 'Match', 'Requested Printing'],
    ...groups.flatMap((group) =>
      group.cards.map((card) => [
        group.artist,
        card.cardName,
        String(card.quantity),
        matchTypeLabel(card.matchType),
        card.requestedPrinting
          ? `${card.requestedPrinting.setCode} #${card.requestedPrinting.collectorNumber}`
          : '',
      ]),
    ),
  ]

  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\n')
}

function matchTypeLabel(matchType: SignableCard['matchType']) {
  if (matchType === 'exact-printing') {
    return 'Exact'
  }

  if (matchType === 'alternate-printing') {
    return 'Alt print'
  }

  return 'Any print'
}

function escapeCsvField(value: string) {
  if (!/[",\n]/.test(value)) {
    return value
  }

  return `"${value.replace(/"/g, '""')}"`
}

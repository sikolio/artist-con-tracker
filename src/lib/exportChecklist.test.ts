import { describe, expect, it } from 'vitest'
import { buildChecklistCsv } from './exportChecklist'
import type { SignableCard } from './types'

const cards: SignableCard[] = [
  {
    cardName: 'Sol Ring',
    quantity: 1,
    matchType: 'exact-printing',
    requestedPrinting: { setCode: 'ME4', collectorNumber: '227' },
    artists: ['Mark Tedin'],
    printings: [],
  },
  {
    cardName: 'A card, with comma',
    quantity: 2,
    matchType: 'alternate-printing',
    artists: ['Ken Meyer, Jr.'],
    printings: [],
  },
]

describe('buildChecklistCsv', () => {
  it('exports signing groups as escaped CSV rows', () => {
    expect(
      buildChecklistCsv([
        {
          artist: 'Mark Tedin',
          cards,
        },
      ]),
    ).toBe(
      [
        'Artist,Card,Quantity,Match,Requested Printing',
        'Mark Tedin,Sol Ring,1,Exact,ME4 #227',
        'Mark Tedin,"A card, with comma",2,Alt print,',
      ].join('\n'),
    )
  })
})

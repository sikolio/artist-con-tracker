import { describe, expect, it } from 'vitest'
import {
  buildPremiumConventionSuggestions,
  buildPremiumSuggestionTeaser,
} from './premiumSuggestions'
import type { Convention, DeckEntry, ScryfallPrinting, SignableCard } from './types'

const deck: DeckEntry[] = [
  { name: 'Sol Ring', quantity: 1 },
  { name: 'Lightning Bolt', quantity: 1 },
  { name: 'Counterspell', quantity: 1 },
]

const printingsByName = new Map<string, ScryfallPrinting[]>([
  [
    'sol ring',
    [
      {
        id: 'sol-ring',
        name: 'Sol Ring',
        artist: 'Mark Tedin',
        setCode: 'cmm',
        setName: 'Commander Masters',
        collectorNumber: '400',
        scryfallUri: 'https://scryfall.com/card/cmm/400/sol-ring',
      },
    ],
  ],
  [
    'lightning bolt',
    [
      {
        id: 'bolt',
        name: 'Lightning Bolt',
        artist: 'Christopher Rush',
        setCode: 'lea',
        setName: 'Limited Edition Alpha',
        collectorNumber: '161',
        scryfallUri: 'https://scryfall.com/card/lea/161/lightning-bolt',
      },
    ],
  ],
  [
    'counterspell',
    [
      {
        id: 'counterspell',
        name: 'Counterspell',
        artist: 'Ken Meyer Jr.',
        setCode: 'vma',
        setName: 'Vintage Masters',
        collectorNumber: '61',
        scryfallUri: 'https://scryfall.com/card/vma/61/counterspell',
      },
    ],
  ],
])

const currentSignableCards: SignableCard[] = [
  {
    cardName: 'Sol Ring',
    quantity: 1,
    matchType: 'any-printing',
    artists: ['Mark Tedin'],
    printings: [printingsByName.get('sol ring')![0]],
  },
]

const conventions: Convention[] = [
  convention('current', 'Current CON', ['Mark Tedin']),
  convention('rush-con', 'Rush CON', ['Christopher Rush']),
  convention('meyer-con', 'Meyer CON', ['Ken Meyer Jr.']),
  convention('combo-con', 'Combo CON', ['Christopher Rush', 'Ken Meyer Jr.']),
]

describe('buildPremiumConventionSuggestions', () => {
  it('suggests other conventions that cover cards missed by the selected convention', () => {
    expect(
      buildPremiumConventionSuggestions({
        deck,
        printingsByName,
        currentSignableCards,
        conventions,
        selectedConventionId: 'current',
      }),
    ).toEqual([
      {
        conventionId: 'combo-con',
        conventionName: 'Combo CON',
        dateRange: 'Soon',
        location: 'Somewhere',
        coveredCards: [
          { cardName: 'Lightning Bolt', artists: ['Christopher Rush'] },
          { cardName: 'Counterspell', artists: ['Ken Meyer Jr.'] },
        ],
      },
      {
        conventionId: 'rush-con',
        conventionName: 'Rush CON',
        dateRange: 'Soon',
        location: 'Somewhere',
        coveredCards: [
          { cardName: 'Lightning Bolt', artists: ['Christopher Rush'] },
        ],
      },
      {
        conventionId: 'meyer-con',
        conventionName: 'Meyer CON',
        dateRange: 'Soon',
        location: 'Somewhere',
        coveredCards: [
          { cardName: 'Counterspell', artists: ['Ken Meyer Jr.'] },
        ],
      },
    ])
  })
})

describe('buildPremiumSuggestionTeaser', () => {
  it('reveals one convention and one card while locking the rest of the coverage', () => {
    const suggestions = buildPremiumConventionSuggestions({
      deck,
      printingsByName,
      currentSignableCards,
      conventions,
      selectedConventionId: 'current',
    })

    expect(buildPremiumSuggestionTeaser(suggestions)).toEqual({
      visibleSuggestion: {
        conventionId: 'combo-con',
        conventionName: 'Combo CON',
        dateRange: 'Soon',
        location: 'Somewhere',
        coveredCard: {
          cardName: 'Lightning Bolt',
          artists: ['Christopher Rush'],
        },
      },
      lockedMatchCount: 3,
      lockedConventionCount: 2,
    })
  })

  it('counts locked duplicate-card convention coverage as hidden matches', () => {
    const suggestions = [
      {
        conventionId: 'poole-dallas',
        conventionName: 'Poole Dallas',
        dateRange: 'Soon',
        location: 'Somewhere',
        coveredCards: [
          { cardName: 'Birds of Paradise', artists: ['Mark Poole'] },
        ],
      },
      {
        conventionId: 'poole-la',
        conventionName: 'Poole LA',
        dateRange: 'Later',
        location: 'Elsewhere',
        coveredCards: [
          { cardName: 'Birds of Paradise', artists: ['Mark Poole'] },
        ],
      },
    ]

    expect(buildPremiumSuggestionTeaser(suggestions)?.lockedMatchCount).toBe(1)
  })

  it('returns no teaser when there are no premium suggestions', () => {
    expect(buildPremiumSuggestionTeaser([])).toBeNull()
  })
})

function convention(id: string, name: string, artists: string[]): Convention {
  return {
    id,
    name,
    dateRange: 'Soon',
    location: 'Somewhere',
    sourceUrl: `https://example.com/${id}`,
    artists,
  }
}

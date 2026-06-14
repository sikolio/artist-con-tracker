import { describe, expect, it } from 'vitest'
import {
  findMatchedAttendingArtists,
  findSignableCards,
  getArtistSigningCards,
  groupSignableCardsByArtist,
} from './matching'
import type { DeckEntry, ScryfallPrinting, SignableCard } from './types'

const deck: DeckEntry[] = [
  { name: 'Sol Ring', quantity: 1 },
  { name: 'Counterspell', quantity: 2 },
  { name: 'Lightning Bolt', quantity: 4 },
]

const printingsByName = new Map<string, ScryfallPrinting[]>([
  [
    'sol ring',
    [
      {
        id: 'sol-ring-1',
        name: 'Sol Ring',
        artist: 'Mark Tedin',
        setCode: 'cmm',
        setName: 'Commander Masters',
        collectorNumber: '400',
        scryfallUri: 'https://scryfall.com/card/cmm/400/sol-ring',
      },
      {
        id: 'sol-ring-2',
        name: 'Sol Ring',
        artist: 'Somebody Else',
        setCode: 'ub',
        setName: 'Universes Beyond',
        collectorNumber: '1',
        scryfallUri: 'https://scryfall.com/card/ub/1/sol-ring',
      },
    ],
  ],
  [
    'counterspell',
    [
      {
        id: 'counterspell-1',
        name: 'Counterspell',
        artist: 'Ken Meyer, Jr.',
        setCode: 'vma',
        setName: 'Vintage Masters',
        collectorNumber: '61',
        scryfallUri: 'https://scryfall.com/card/vma/61/counterspell',
      },
    ],
  ],
  [
    'lightning bolt',
    [
      {
        id: 'bolt-1',
        name: 'Lightning Bolt',
        artist: 'Phil Foglio & Kaja Foglio',
        setCode: 'me1',
        setName: 'Masters Edition',
        collectorNumber: '100',
        scryfallUri: 'https://scryfall.com/card/me1/100/lightning-bolt',
      },
    ],
  ],
])

describe('findSignableCards', () => {
  it('matches deck cards to printings by attending artists', () => {
    const result = findSignableCards(deck, printingsByName, [
      'Mark Tedin',
      'Ken Meyer Jr.',
    ])

    expect(result).toEqual([
      {
        cardName: 'Sol Ring',
        quantity: 1,
        matchType: 'any-printing',
        artists: ['Mark Tedin'],
        printings: [printingsByName.get('sol ring')![0]],
      },
      {
        cardName: 'Counterspell',
        quantity: 2,
        matchType: 'any-printing',
        artists: ['Ken Meyer, Jr.'],
        printings: [printingsByName.get('counterspell')![0]],
      },
    ])
  })

  it('matches individual artists inside multi-artist Scryfall credits', () => {
    const result = findSignableCards(deck, printingsByName, ['Kaja Foglio'])

    expect(result).toEqual([
      {
        cardName: 'Lightning Bolt',
        quantity: 4,
        matchType: 'any-printing',
        artists: ['Phil Foglio & Kaja Foglio'],
        printings: [printingsByName.get('lightning bolt')![0]],
      },
    ])
  })

  it('separates exact printing matches from alternate signable printings', () => {
    const result = findSignableCards(
      [
        {
          name: 'Sol Ring',
          quantity: 1,
          printing: { setCode: 'CMM', collectorNumber: '400' },
        },
        {
          name: 'Sol Ring',
          quantity: 1,
          printing: { setCode: 'UB', collectorNumber: '1' },
        },
      ],
      printingsByName,
      ['Mark Tedin'],
      { exactMode: true },
    )

    expect(result).toEqual([
      {
        cardName: 'Sol Ring',
        quantity: 1,
        requestedPrinting: { setCode: 'CMM', collectorNumber: '400' },
        matchType: 'exact-printing',
        artists: ['Mark Tedin'],
        printings: [printingsByName.get('sol ring')![0]],
      },
      {
        cardName: 'Sol Ring',
        quantity: 1,
        requestedPrinting: { setCode: 'UB', collectorNumber: '1' },
        matchType: 'alternate-printing',
        artists: ['Mark Tedin'],
        printings: [printingsByName.get('sol ring')![0]],
      },
    ])
  })
})

describe('findMatchedAttendingArtists', () => {
  it('returns attending artist names that appear in signable card credits', () => {
    const signableCards: SignableCard[] = [
      {
        cardName: 'Counterspell',
        quantity: 2,
        matchType: 'any-printing',
        artists: ['Ken Meyer, Jr.'],
        printings: [printingsByName.get('counterspell')![0]],
      },
      {
        cardName: 'Lightning Bolt',
        quantity: 4,
        matchType: 'any-printing',
        artists: ['Phil Foglio & Kaja Foglio'],
        printings: [printingsByName.get('lightning bolt')![0]],
      },
    ]

    const result = findMatchedAttendingArtists(signableCards, [
      'Ken Meyer Jr.',
      'Phil Foglio',
      'Kaja Foglio',
      'Mark Tedin',
    ])

    expect(result).toEqual(['Ken Meyer Jr.', 'Phil Foglio', 'Kaja Foglio'])
  })
})

describe('getArtistSigningCards', () => {
  const signableCards: SignableCard[] = [
    {
      cardName: 'Sol Ring',
      quantity: 1,
      matchType: 'any-printing',
      artists: ['Mark Tedin'],
      printings: [printingsByName.get('sol ring')![0]],
    },
    {
      cardName: 'Lightning Bolt',
      quantity: 4,
      matchType: 'any-printing',
      artists: ['Phil Foglio & Kaja Foglio'],
      printings: [printingsByName.get('lightning bolt')![0]],
    },
  ]

  it('finds cards for a selected attending artist, including multi-artist credits', () => {
    expect(getArtistSigningCards(signableCards, 'Kaja Foglio')).toEqual([
      signableCards[1],
    ])
  })

  it('groups signable cards by attending artist in convention order', () => {
    const result = groupSignableCardsByArtist(signableCards, [
      'Kaja Foglio',
      'Mark Tedin',
      'Phil Foglio',
      'Ken Meyer Jr.',
    ])

    expect(result).toEqual([
      { artist: 'Kaja Foglio', cards: [signableCards[1]] },
      { artist: 'Mark Tedin', cards: [signableCards[0]] },
      { artist: 'Phil Foglio', cards: [signableCards[1]] },
    ])
  })
})

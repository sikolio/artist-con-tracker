import { describe, expect, it } from 'vitest'
import { parseDecklist } from './decklist'

describe('parseDecklist', () => {
  it('parses common MTG decklist lines and totals duplicate card names', () => {
    const result = parseDecklist(`
Commander
1 Kenrith, the Returned King

Creatures
2 Birds of Paradise (RVR) 138
1x Birds of Paradise
SB: 3 Force of Negation # sideboard copies
1 Sol Ring // old border
`)

    expect(result).toEqual([
      { name: 'Kenrith, the Returned King', quantity: 1 },
      {
        name: 'Birds of Paradise',
        quantity: 2,
        printing: { setCode: 'RVR', collectorNumber: '138' },
      },
      { name: 'Birds of Paradise', quantity: 1 },
      { name: 'Force of Negation', quantity: 3 },
      { name: 'Sol Ring', quantity: 1 },
    ])
  })

  it('combines repeated exact printing hints separately from generic copies', () => {
    const result = parseDecklist(`
1 Sol Ring (CMM) 400
2 Sol Ring [CMM] 400
1 Sol Ring (WHO) 245
1 Sol Ring
`)

    expect(result).toEqual([
      {
        name: 'Sol Ring',
        quantity: 3,
        printing: { setCode: 'CMM', collectorNumber: '400' },
      },
      {
        name: 'Sol Ring',
        quantity: 1,
        printing: { setCode: 'WHO', collectorNumber: '245' },
      },
      { name: 'Sol Ring', quantity: 1 },
    ])
  })

  it('ignores headings, blank lines, and unparseable notes', () => {
    const result = parseDecklist(`
Mainboard
// maybe board in later
Lands
twenty Islands
4 Island
`)

    expect(result).toEqual([{ name: 'Island', quantity: 4 }])
  })
})

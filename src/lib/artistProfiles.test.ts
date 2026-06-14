import { describe, expect, it } from 'vitest'
import { getArtistProfile } from './artistProfiles'
import type { Convention } from './types'

const convention: Convention = {
  id: 'test-con',
  name: 'Test Con',
  dateRange: 'January 1-2, 2027',
  location: 'Test City',
  sourceUrl: 'https://example.com/event',
  artists: ['Mark Tedin', 'Kaja Foglio'],
  artistProfiles: {
    'Mark Tedin': {
      booth: 'Table A1',
      schedule: 'Friday afternoon',
      signingFee: '$5 per card',
      alterSketchPolicy: 'Sketches by request',
      sourceUrl: 'https://example.com/mark',
    },
  },
}

describe('getArtistProfile', () => {
  it('returns explicit convention profile data when available', () => {
    expect(getArtistProfile(convention, 'Mark Tedin')).toEqual({
      booth: 'Table A1',
      schedule: 'Friday afternoon',
      signingFee: '$5 per card',
      alterSketchPolicy: 'Sketches by request',
      sourceUrl: 'https://example.com/mark',
    })
  })

  it('falls back to source-linked not-published values', () => {
    expect(getArtistProfile(convention, 'Kaja Foglio')).toEqual({
      booth: 'Not published yet',
      schedule: 'Not published yet',
      signingFee: 'Not published yet',
      alterSketchPolicy: 'Not published yet',
      sourceUrl: 'https://example.com/event',
    })
  })
})

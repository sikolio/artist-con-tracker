import { describe, expect, it } from 'vitest'
import { conventions } from './conventions'

describe('conventions', () => {
  it('includes the current SCG CON selector events', () => {
    expect(conventions.map((convention) => convention.id)).toEqual([
      'scg-con-las-vegas-2026',
      'scg-con-dallas-2026',
      'scg-con-baltimore-2026',
      'scg-con-los-angeles-2026',
    ])
  })
})

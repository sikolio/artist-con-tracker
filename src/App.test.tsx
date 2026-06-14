import { cleanup, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders the signature finder workspace with convention details', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /signature finder/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /convention/i })).toBeInTheDocument()
    expect(screen.getAllByText(/SCG CON Las Vegas 2026/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/26 artists/)).toHaveLength(2)
    const decklistInput = screen.getByLabelText(/decklist/i) as HTMLTextAreaElement

    expect(decklistInput.value).toContain('Sol Ring (ME4) 227')
    expect(screen.getByRole('checkbox', { name: /exact printing mode/i })).toBeChecked()
    expect(screen.getByRole('searchbox', { name: /artist search/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mark Tedin/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /refresh card data/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /print checklist/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download csv/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /all cards/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /selected artist/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /copy plan/i })).toBeInTheDocument()
    expect(screen.getByText(/booth/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /check deck/i })).toBeInTheDocument()
  })

  it('migrates a saved bundled sample decklist after app updates', () => {
    localStorage.setItem(
      'card-artist-tracker:preferences',
      JSON.stringify({
        decklist: `1 Sol Ring
1 Counterspell
1 Birds of Paradise
1 Lightning Bolt
1 Ponder
1 Swords to Plowshares
1 Rhystic Study
1 Damnation`,
        exactPrintingMode: false,
        selectedConventionId: 'scg-con-las-vegas-2026',
      }),
    )

    render(<App />)

    const decklistInput = screen.getByLabelText(/decklist/i) as HTMLTextAreaElement

    expect(decklistInput.value).toContain('Sol Ring (ME4) 227')
    expect(screen.getByRole('checkbox', { name: /exact printing mode/i })).toBeChecked()
  })
})

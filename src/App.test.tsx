import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the signature finder workspace with convention details', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /signature finder/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /convention/i })).toBeInTheDocument()
    expect(screen.getAllByText(/SCG CON Las Vegas 2026/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/26 artists/)).toHaveLength(2)
    expect(screen.getByRole('checkbox', { name: /exact printing mode/i })).toBeInTheDocument()
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
})

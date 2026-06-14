import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Download,
  ExternalLink,
  LoaderCircle,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
} from 'lucide-react'
import './App.css'
import { conventions } from './data/conventions'
import { getArtistProfile } from './lib/artistProfiles'
import { parseDecklist, normalizeCardName } from './lib/decklist'
import { buildChecklistCsv } from './lib/exportChecklist'
import {
  loadAppPreferences,
  migrateAppPreferences,
  saveAppPreferences,
} from './lib/preferences'
import {
  findMatchedAttendingArtists,
  findSignableCards,
  getArtistSigningCards,
  groupSignableCardsByArtist,
  normalizeArtistName,
} from './lib/matching'
import { buildSigningPlan } from './lib/signingPlan'
import {
  clearLocalStorageScryfallCache,
  createLocalStorageScryfallCache,
  fetchPrintingsForDeck,
} from './lib/scryfall'
import type { SignableCard } from './lib/types'

const sampleDecklist = `1 Sol Ring (ME4) 227
1 Counterspell (VMA) 61
1 Birds of Paradise (M11) 168
1 Lightning Bolt (ME1) 100
1 Ponder (M10) 68
1 Swords to Plowshares (BRC) 111
1 Rhystic Study
1 Damnation`

const legacySampleDecklists = [
  `1 Sol Ring
1 Counterspell
1 Birds of Paradise
1 Lightning Bolt
1 Ponder
1 Swords to Plowshares
1 Rhystic Study
1 Damnation`,
]

type AnalysisResult = {
  signableCards: SignableCard[]
  missingCards: string[]
  checkedCardCount: number
}

function App() {
  const initialPreferences = useMemo(
    () =>
      migrateAppPreferences(loadAppPreferences(), {
        currentSampleDecklist: sampleDecklist,
        legacySampleDecklists,
      }),
    [],
  )
  const initialDecklist = initialPreferences.decklist ?? sampleDecklist
  const [selectedConventionId, setSelectedConventionId] = useState(
    getInitialConventionId(initialPreferences.selectedConventionId),
  )
  const [decklist, setDecklist] = useState(initialDecklist)
  const [exactPrintingMode, setExactPrintingMode] = useState(
    initialPreferences.exactPrintingMode ?? decklistHasPrintingHints(initialDecklist),
  )
  const [selectedArtist, setSelectedArtist] = useState('Mark Tedin')
  const [artistSearch, setArtistSearch] = useState('')
  const [resultFilter, setResultFilter] = useState<'all' | 'selected'>('all')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const convention = useMemo(
    () =>
      conventions.find((candidate) => candidate.id === selectedConventionId) ??
      conventions[0],
    [selectedConventionId],
  )
  const scryfallCache = useMemo(() => createLocalStorageScryfallCache(), [])
  const parsedDeck = useMemo(() => parseDecklist(decklist), [decklist])
  const parsedQuantity = parsedDeck.reduce((total, card) => total + card.quantity, 0)
  const signableQuantity =
    result?.signableCards.reduce((total, card) => total + card.quantity, 0) ?? 0
  const exactQuantity =
    result?.signableCards
      .filter((card) => card.matchType === 'exact-printing')
      .reduce((total, card) => total + card.quantity, 0) ?? 0
  const alternateQuantity =
    result?.signableCards
      .filter((card) => card.matchType === 'alternate-printing')
      .reduce((total, card) => total + card.quantity, 0) ?? 0
  const matchedArtistNames = useMemo(
    () =>
      new Set(
        result
          ? findMatchedAttendingArtists(result.signableCards, convention.artists)
          : [],
      ),
    [convention.artists, result],
  )
  const visibleArtists = useMemo(() => {
    const query = normalizeArtistName(artistSearch)

    if (!query) {
      return convention.artists
    }

    return convention.artists.filter((artist) =>
      normalizeArtistName(artist).includes(query),
    )
  }, [artistSearch, convention.artists])
  const matchedArtistCount = matchedArtistNames.size
  const selectedArtistCards = result
    ? getArtistSigningCards(result.signableCards, selectedArtist)
    : []
  const visibleSignableCards = useMemo(() => {
    if (!result) {
      return []
    }

    return resultFilter === 'selected'
      ? getArtistSigningCards(result.signableCards, selectedArtist)
      : result.signableCards
  }, [result, resultFilter, selectedArtist])
  const selectedArtistProfile = getArtistProfile(convention, selectedArtist)
  const signingGroups = useMemo(
    () =>
      result
        ? groupSignableCardsByArtist(result.signableCards, convention.artists)
        : [],
    [convention.artists, result],
  )
  const signingPlan = useMemo(
    () => buildSigningPlan(result?.signableCards ?? []),
    [result],
  )
  const unmatchedCards = useMemo(() => {
    if (!result) {
      return []
    }

    const matchedNames = new Set(
      result.signableCards.map((card) => normalizeCardName(card.cardName)),
    )
    return parsedDeck.filter((card) => !matchedNames.has(normalizeCardName(card.name)))
  }, [parsedDeck, result])

  useEffect(() => {
    saveAppPreferences({
      decklist,
      exactPrintingMode,
      selectedConventionId,
    })
  }, [decklist, exactPrintingMode, selectedConventionId])

  async function checkDeck() {
    if (parsedDeck.length === 0) {
      setError('No deck cards found.')
      setResult(null)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setIsLoading(true)
    setError('')

    try {
      const lookup = await fetchPrintingsForDeck(
        parsedDeck,
        controller.signal,
        fetch,
        scryfallCache,
      )
      const signableCards = findSignableCards(
        parsedDeck,
        lookup.printingsByName,
        convention.artists,
        { exactMode: exactPrintingMode },
      )

      setResult({
        signableCards,
        missingCards: lookup.missingCards,
        checkedCardCount: parsedDeck.length,
      })
      setResultFilter('all')
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === 'AbortError') {
        return
      }

      setError('Scryfall lookup failed. Please try again.')
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  function changeConvention(conventionId: string) {
    const nextConvention =
      conventions.find((candidate) => candidate.id === conventionId) ??
      conventions[0]

    setSelectedConventionId(nextConvention.id)
    setSelectedArtist(nextConvention.artists[0] ?? '')
    setResult(null)
    setError('')
  }

  function downloadChecklistCsv() {
    const csv = buildChecklistCsv(signingGroups)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${convention.id}-signing-checklist.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function refreshCardData() {
    clearLocalStorageScryfallCache()
    await checkDeck()
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">MTG convention signing planner</p>
          <h1>Signature Finder</h1>
        </div>
        <div className="topbar-actions">
          <label className="convention-picker">
            <span>Convention</span>
            <select
              aria-label="Convention"
              onChange={(event) => changeConvention(event.target.value)}
              value={selectedConventionId}
            >
              {conventions.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </label>
          <a
            className="source-link"
            href={convention.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Source
            <ExternalLink aria-hidden="true" size={16} />
          </a>
        </div>
      </header>

      <section className="event-strip" aria-label="Selected convention">
        <div>
          <p className="label">Convention</p>
          <strong>{convention.name}</strong>
        </div>
        <div>
          <p className="label">Dates</p>
          <strong>{convention.dateRange}</strong>
        </div>
        <div>
          <p className="label">Location</p>
          <strong>{convention.location}</strong>
        </div>
        <div>
          <p className="label">Guest list</p>
          <strong>{convention.artists.length} artists</strong>
        </div>
      </section>

      <section className="workspace">
        <div className="workspace-panel deck-panel">
          <div className="panel-heading">
            <div>
              <p className="label">Decklist</p>
              <h2>{parsedDeck.length} unique cards</h2>
            </div>
            <span className="quantity-pill">{parsedQuantity} total</span>
          </div>

          <textarea
            aria-label="Decklist"
            value={decklist}
            spellCheck={false}
            onChange={(event) => setDecklist(event.target.value)}
          />

          <label className="mode-toggle">
            <input
              checked={exactPrintingMode}
              onChange={(event) => setExactPrintingMode(event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>Exact printing mode</strong>
              <small>Use set codes and collector numbers when provided.</small>
            </span>
          </label>

          <div className="deck-actions">
            <button className="primary-action" type="button" onClick={checkDeck} disabled={isLoading}>
              {isLoading ? (
                <LoaderCircle className="spin" aria-hidden="true" size={18} />
              ) : (
                <Search aria-hidden="true" size={18} />
              )}
              Check deck
            </button>
            <button
              className="secondary-action"
              disabled={isLoading}
              onClick={refreshCardData}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={17} />
              Refresh card data
            </button>
          </div>

          {error ? <p className="error-message">{error}</p> : null}
        </div>

        <aside className="workspace-panel artist-panel">
          <div className="panel-heading">
            <div>
              <p className="label">Attending artists</p>
              <h2>{convention.artists.length} artists</h2>
            </div>
          </div>
          <input
            aria-label="Artist search"
            className="artist-search"
            onChange={(event) => setArtistSearch(event.target.value)}
            placeholder="Search artists"
            type="search"
            value={artistSearch}
          />
          <div className="artist-grid">
            {visibleArtists.map((artist) => {
              const isMatched = matchedArtistNames.has(artist)
              const isSelected = selectedArtist === artist

              return (
                <button
                  aria-pressed={isSelected}
                  className={[
                    'artist-chip',
                    isMatched ? 'artist-chip--matched' : '',
                    isSelected ? 'artist-chip--selected' : '',
                  ].filter(Boolean).join(' ')}
                  key={artist}
                  onClick={() => setSelectedArtist(artist)}
                  type="button"
                >
                  {artist}
                  {isMatched ? <Check aria-hidden="true" size={14} /> : null}
                </button>
              )
            })}
          </div>
          {visibleArtists.length === 0 ? (
            <p className="artist-empty-state">No artists found.</p>
          ) : null}

          <div className="artist-detail-panel">
            <div className="panel-heading">
              <div>
                <p className="label">Selected artist</p>
                <h2>{selectedArtist}</h2>
              </div>
              <span className="quantity-pill">{selectedArtistCards.length} cards</span>
            </div>

            <dl className="artist-profile">
              <div>
                <dt>Booth</dt>
                <dd>{selectedArtistProfile.booth}</dd>
              </div>
              <div>
                <dt>Schedule</dt>
                <dd>{selectedArtistProfile.schedule}</dd>
              </div>
              <div>
                <dt>Signing fee</dt>
                <dd>{selectedArtistProfile.signingFee}</dd>
              </div>
              <div>
                <dt>Alter/sketch policy</dt>
                <dd>{selectedArtistProfile.alterSketchPolicy}</dd>
              </div>
            </dl>

            <a
              className="profile-source-link"
              href={selectedArtistProfile.sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              Profile source
              <ExternalLink aria-hidden="true" size={14} />
            </a>

            {selectedArtistCards.length > 0 ? (
              <ul className="artist-card-list">
                {selectedArtistCards.map((card) => (
                  <li key={`${selectedArtist}-${card.cardName}-${card.requestedPrinting?.setCode ?? 'any'}-${card.requestedPrinting?.collectorNumber ?? 'any'}`}>
                    <strong>{card.cardName}</strong>
                    <span>
                      {card.quantity} copy
                      {card.quantity === 1 ? '' : 'ies'}
                      {card.requestedPrinting ? ` - ${formatPrintingHint(card.requestedPrinting)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="artist-empty-state">
                Run a lookup, then choose a highlighted artist to see their cards.
              </p>
            )}
          </div>
        </aside>
      </section>

      <section className="results" aria-live="polite">
        <div className="results-toolbar">
          <div>
            <p className="label">Signing checklist</p>
            <h2>Grouped by artist</h2>
          </div>
          <div className="results-actions">
            <button
              className="secondary-action"
              disabled={signingGroups.length === 0}
              onClick={() => window.print()}
              type="button"
            >
              <Printer aria-hidden="true" size={17} />
              Print checklist
            </button>
            <button
              className="secondary-action"
              disabled={signingGroups.length === 0}
              onClick={downloadChecklistCsv}
              type="button"
            >
              <Download aria-hidden="true" size={17} />
              Download CSV
            </button>
            <div className="segmented-control" aria-label="Card result filter">
              <button
                aria-pressed={resultFilter === 'all'}
                onClick={() => setResultFilter('all')}
                type="button"
              >
                All cards
              </button>
              <button
                aria-pressed={resultFilter === 'selected'}
                onClick={() => setResultFilter('selected')}
                type="button"
              >
                Selected artist
              </button>
            </div>
          </div>
        </div>

        <div className="summary-row">
          <SummaryCard label="Signable cards" value={String(result ? result.signableCards.length : 0)} />
          <SummaryCard label={exactPrintingMode ? 'Exact copies' : 'Copies'} value={String(exactPrintingMode ? exactQuantity : signableQuantity)} />
          <SummaryCard label={exactPrintingMode ? 'Alternate copies' : 'Matched artists'} value={String(exactPrintingMode ? alternateQuantity : matchedArtistCount)} />
          <SummaryCard label="Checked" value={String(result?.checkedCardCount ?? parsedDeck.length)} />
        </div>

        <section className="copy-plan" aria-label="Copy plan">
          <div className="panel-heading">
            <div>
              <p className="label">Next actions</p>
              <h2>Copy plan</h2>
            </div>
          </div>
          <div className="copy-plan-grid">
            <CopyPlanColumn
              cards={signingPlan.bringCards}
              emptyText={result ? 'No copies ready yet.' : 'Run a lookup.'}
              icon={<PackageCheck aria-hidden="true" size={18} />}
              label="Bring"
              quantity={signingPlan.bringQuantity}
            />
            <CopyPlanColumn
              cards={signingPlan.findAlternateCards}
              emptyText="No alternate printings needed."
              icon={<ShoppingBag aria-hidden="true" size={18} />}
              label="Find"
              quantity={signingPlan.findAlternateQuantity}
            />
          </div>
        </section>

        {!result ? (
          <div className="empty-results">
            <Sparkles aria-hidden="true" size={22} />
            <h2>Ready for lookup</h2>
          </div>
        ) : visibleSignableCards.length > 0 ? (
          <div className="result-list">
            {visibleSignableCards.map((card) => (
              <article className={`result-card result-card--${card.matchType}`} key={`${card.cardName}-${card.requestedPrinting?.setCode ?? 'any'}-${card.requestedPrinting?.collectorNumber ?? 'any'}`}>
                <div className="result-title">
                  <div>
                    <p className="label">
                      {card.quantity} in deck
                      {card.requestedPrinting ? ` - ${formatPrintingHint(card.requestedPrinting)}` : ''}
                    </p>
                    <h3>{card.cardName}</h3>
                  </div>
                  <span className={`match-badge match-badge--${card.matchType}`}>
                    {matchTypeLabel(card.matchType)}
                  </span>
                </div>

                <div className="matched-artists">
                  {card.artists.map((artist) => (
                    <span key={artist}>{artist}</span>
                  ))}
                </div>

                <ul className="printing-list">
                  {card.printings.slice(0, 6).map((printing) => (
                    <li key={printing.id}>
                      {printing.imageUri ? (
                        <img src={printing.imageUri} alt="" loading="lazy" />
                      ) : (
                        <div className="image-placeholder" aria-hidden="true" />
                      )}
                      <div>
                        <strong>{printing.setName}</strong>
                        <span>
                          #{printing.collectorNumber} by {printing.artist}
                        </span>
                      </div>
                      <a href={printing.scryfallUri} target="_blank" rel="noreferrer" aria-label={`${printing.name} on Scryfall`}>
                        <ExternalLink aria-hidden="true" size={16} />
                      </a>
                    </li>
                  ))}
                </ul>

                {card.printings.length > 6 ? (
                  <p className="more-printings">+{card.printings.length - 6} more printings</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-results">
            <Sparkles aria-hidden="true" size={22} />
            <h2>
              {result.signableCards.length > 0
                ? `No cards for ${selectedArtist}`
                : 'No matching artists found'}
            </h2>
          </div>
        )}

        {result && (unmatchedCards.length > 0 || result.missingCards.length > 0) ? (
          <details className="unmatched">
            <summary>Unmatched cards</summary>
            <div className="unmatched-grid">
              {unmatchedCards.map((card) => (
                <span key={card.name}>
                  {card.quantity} {card.name}
                </span>
              ))}
              {result.missingCards.map((card) => (
                <span key={`missing-${card}`}>{card} not found</span>
              ))}
            </div>
          </details>
        ) : null}

        {signingGroups.length > 0 ? (
          <section className="print-checklist" aria-label="Printable signing checklist">
            <div className="print-heading">
              <p className="label">{convention.name}</p>
              <h2>Signing checklist</h2>
            </div>
            <div className="checklist-groups">
              {signingGroups.map((group) => (
                <article className="checklist-group" key={group.artist}>
                  <h3>{group.artist}</h3>
                  <ul>
                    {group.cards.map((card) => (
                      <li key={`${group.artist}-${card.cardName}-${card.requestedPrinting?.setCode ?? 'any'}-${card.requestedPrinting?.collectorNumber ?? 'any'}`}>
                        <span className="check-box" aria-hidden="true" />
                        <div>
                          <strong>{card.cardName}</strong>
                          <span>
                            {card.quantity} copy
                            {card.quantity === 1 ? '' : 'ies'} - {matchTypeLabel(card.matchType)}
                            {card.requestedPrinting ? ` - ${formatPrintingHint(card.requestedPrinting)}` : ''}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  )
}

function formatPrintingHint(printing: { setCode: string; collectorNumber: string }) {
  return `${printing.setCode} #${printing.collectorNumber}`
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function getInitialConventionId(preferredConventionId: string | undefined) {
  return conventions.some((candidate) => candidate.id === preferredConventionId)
    ? preferredConventionId!
    : conventions[0].id
}

function decklistHasPrintingHints(decklist: string) {
  return parseDecklist(decklist).some((card) => card.printing)
}

function CopyPlanColumn({
  cards,
  emptyText,
  icon,
  label,
  quantity,
}: {
  cards: SignableCard[]
  emptyText: string
  icon: ReactNode
  label: string
  quantity: number
}) {
  return (
    <article className="copy-plan-column">
      <div className="copy-plan-title">
        {icon}
        <div>
          <strong>{label}</strong>
          <span>
            {quantity} cop{quantity === 1 ? 'y' : 'ies'}
          </span>
        </div>
      </div>
      {cards.length > 0 ? (
        <ul>
          {cards.slice(0, 5).map((card) => (
            <li key={`${label}-${card.cardName}-${card.requestedPrinting?.setCode ?? 'any'}-${card.requestedPrinting?.collectorNumber ?? 'any'}`}>
              <span>{card.quantity}</span>
              <strong>{card.cardName}</strong>
              <em>{matchTypeLabel(card.matchType)}</em>
            </li>
          ))}
        </ul>
      ) : (
        <p>{emptyText}</p>
      )}
      {cards.length > 5 ? (
        <small>+{cards.length - 5} more</small>
      ) : null}
    </article>
  )
}

export default App

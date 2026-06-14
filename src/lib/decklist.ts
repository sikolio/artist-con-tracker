import type { DeckEntry } from './types'

export function normalizeCardName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function parseDecklist(rawDecklist: string): DeckEntry[] {
  const byName = new Map<string, DeckEntry>()

  for (const rawLine of rawDecklist.split(/\r?\n/)) {
    const line = stripInlineComment(rawLine).trim()

    if (!line) {
      continue
    }

    const withoutSideboardMarker = line.replace(/^(?:sb|sideboard)\s*:\s*/i, '')
    const match = withoutSideboardMarker.match(/^(\d+)\s*x?\s+(.+)$/i)

    if (!match) {
      continue
    }

    const quantity = Number.parseInt(match[1], 10)
    const parsedCard = parseCardText(match[2])
    const { name, printing } = parsedCard

    if (!quantity || !name) {
      continue
    }

    const key = deckEntryKey(parsedCard)
    const existing = byName.get(key)

    if (existing) {
      existing.quantity += quantity
    } else {
      byName.set(key, printing ? { name, quantity, printing } : { name, quantity })
    }
  }

  return [...byName.values()]
}

function stripInlineComment(line: string) {
  const hashIndex = line.indexOf('#')
  const withoutHash = hashIndex >= 0 ? line.slice(0, hashIndex) : line
  const slashIndex = withoutHash.indexOf(' // ')

  if (slashIndex < 0) {
    return withoutHash
  }

  const afterSlash = withoutHash.slice(slashIndex + 4).trim()
  const looksLikeSplitCardName = /^[A-Z][A-Za-z', -]*(?:$|\s\/\/\s)/.test(afterSlash)

  return looksLikeSplitCardName ? withoutHash : withoutHash.slice(0, slashIndex)
}

function parseCardText(rawCardText: string): Omit<DeckEntry, 'quantity'> {
  const trimmed = rawCardText.trim()
  const printingMatch = trimmed.match(
    /^(.+?)\s+(?:\(([a-z0-9]{2,6})\)|\[([a-z0-9]{2,6})\])\s+([a-z0-9*★-]+)$/i,
  )

  if (printingMatch) {
    return {
      name: cleanCardName(printingMatch[1]),
      printing: {
        setCode: (printingMatch[2] ?? printingMatch[3]).toUpperCase(),
        collectorNumber: printingMatch[4],
      },
    }
  }

  return { name: cleanCardName(trimmed) }
}

function deckEntryKey(entry: Omit<DeckEntry, 'quantity'>) {
  return [
    normalizeCardName(entry.name),
    entry.printing?.setCode.toLowerCase() ?? '',
    entry.printing?.collectorNumber.toLowerCase() ?? '',
  ].join('|')
}

function cleanCardName(rawName: string) {
  return rawName
    .replace(/\s+\([a-z0-9]{2,6}\)\s*[\w-]*$/i, '')
    .replace(/\s+\[[a-z0-9]{2,6}\]\s*[\w-]*$/i, '')
    .replace(/\s+\d+[a-z]?$/i, '')
    .trim()
    .replace(/\s+/g, ' ')
}

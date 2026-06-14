import type { ArtistProfile, Convention } from './types'

const notPublished = 'Not published yet'

export function getArtistProfile(
  convention: Convention,
  artist: string,
): Required<ArtistProfile> {
  const profile = convention.artistProfiles?.[artist]

  return {
    booth: profile?.booth ?? notPublished,
    schedule: profile?.schedule ?? notPublished,
    signingFee: profile?.signingFee ?? notPublished,
    alterSketchPolicy: profile?.alterSketchPolicy ?? notPublished,
    sourceUrl: profile?.sourceUrl ?? convention.sourceUrl,
  }
}

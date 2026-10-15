/**
 * Inhalts-Sammlungen (Astro Content Collections)
 *
 * Die Bausteine (Portfolio, Blog, Events) und die Rechtstexte sind schon eingebunden.
 * Eigene Sammlungen eines Kunden hier ergänzen, z. B.:
 *   const team = defineCollection({ loader: glob({ pattern: '**\/*.md', base: './src/data/team' }), schema: z.object({ … }) });
 *   export const collections = { ...bausteinCollections, team };
 */
import { bausteinCollections } from './lib/bausteine-schema';

export const collections = { ...bausteinCollections };

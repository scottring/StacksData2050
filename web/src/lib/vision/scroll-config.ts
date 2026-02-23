// Scroll configuration for the Vision demo
// Each act is pinned and scrubs through its animation over a defined scroll distance

export const SCROLL_CONFIG = {
  hero: { scrollDistance: '100vh' },
  act1: { scrollDistance: '100vh', scrub: 1 },
  act2: { scrollDistance: '100vh', scrub: 1 },
  act3: { scrollDistance: '100vh', scrub: 1 },
  act4: { scrollDistance: '150vh', scrub: 1 }, // Longest — the hero moment
  act5: { scrollDistance: '100vh', scrub: 1 },
  cta:  { scrollDistance: '50vh' },
} as const

export const ACT_COUNT = 5

export interface ActProgressState {
  currentAct: number
  hero: number
  act1: number
  act2: number
  act3: number
  act4: number
  act5: number
}

export const initialActProgress: ActProgressState = {
  currentAct: 0,
  hero: 0,
  act1: 0,
  act2: 0,
  act3: 0,
  act4: 0,
  act5: 0,
}

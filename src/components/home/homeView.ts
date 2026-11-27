/** The two ways the home dashboard can be drawn. */
export type HomeView = 'simple' | 'full'

/** Cookie holding the learner's choice, read by the page on the server. */
export const HOME_VIEW_COOKIE = 'efom-home-view'

/** A year: the choice is a standing preference. */
export const HOME_VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const DEFAULT_HOME_VIEW: HomeView = 'simple'

export function parseHomeView(value: string | undefined): HomeView {
  return value === 'full' || value === 'simple' ? value : DEFAULT_HOME_VIEW
}

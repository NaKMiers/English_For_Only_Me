import type { Messages } from './messages'
import { en } from './messages/en'

let active: Messages = en

/**
 * The catalogue the browser is showing, for plain client modules outside
 * React (the sync outbox) that need a fallback message. `I18nProvider` keeps
 * it current; it is English until then and on the server.
 */
export function getActiveMessages(): Messages {
  return active
}

export function setActiveMessages(messages: Messages) {
  active = messages
}

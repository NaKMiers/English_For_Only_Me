import { admin } from './admin'
import { common } from './common'
import { dictation } from './dictation'
import { grammar } from './grammar'
import { home } from './home'
import { ielts } from './ielts'
import { ieltsEditor } from './ieltsEditor'
import { vocabulary } from './vocabulary'

/**
 * The English catalogue: the source of truth for every UI string key. The
 * Vietnamese catalogue is typed against it, so a missing or extra key there
 * is a type error.
 */
export const en = {
  admin,
  common,
  dictation,
  grammar,
  home,
  ielts,
  ieltsEditor,
  vocabulary,
}

export type Messages = typeof en

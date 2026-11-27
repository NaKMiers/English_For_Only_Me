import type { Messages } from '../en'
import { admin } from './admin'
import { common } from './common'
import { dictation } from './dictation'
import { grammar } from './grammar'
import { home } from './home'
import { ielts } from './ielts'
import { ieltsEditor } from './ieltsEditor'
import { vocabulary } from './vocabulary'

/** The Vietnamese catalogue. Same keys as `en`, enforced by `Messages`. */
export const vi: Messages = {
  admin,
  common,
  dictation,
  grammar,
  home,
  ielts,
  ieltsEditor,
  vocabulary,
}

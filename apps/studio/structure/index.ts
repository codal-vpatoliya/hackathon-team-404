import {CommentIcon, UsersIcon} from '@sanity/icons'
import type {StructureResolver} from 'sanity/structure'

export const structure: StructureResolver = (S) => {
  return S.list()
    .id('root')
    .title('Content')
    .items([
      S.divider(),
      S.documentTypeListItem('author').title('Authors').icon(UsersIcon),
      S.documentTypeListItem('article').title('Articles').icon(CommentIcon),
    ])
}

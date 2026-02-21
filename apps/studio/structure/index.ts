import {BookIcon, ClipboardIcon, TagsIcon, UserIcon, UsersIcon} from '@sanity/icons'
import type {StructureResolver} from 'sanity/structure'

export const structure: StructureResolver = (S) => {
  return S.list()
    .id('root')
    .title('Library Dashboard')
    .items([
      // ==========================================
      // 1. CIRCULATION DESK (Most frequent actions)
      // ==========================================
      S.documentTypeListItem('loan').title('Borrowing Records').icon(ClipboardIcon),

      S.divider(),

      // ==========================================
      // 2. CATALOG & INVENTORY
      // ==========================================
      S.documentTypeListItem('book').title('Books Inventory').icon(BookIcon),
      S.documentTypeListItem('author').title('Authors').icon(UsersIcon),
      S.documentTypeListItem('category').title('Genres & Categories').icon(TagsIcon),

      S.divider(),

      // ==========================================
      // 3. USER MANAGEMENT
      // ==========================================
      S.documentTypeListItem('member').title('Library Members').icon(UserIcon),
    ])
}

import {BookIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const bookType = defineType({
  name: 'book',
  title: 'Book',
  type: 'document',
  icon: BookIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Book Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'isbn',
      title: 'ISBN',
      type: 'string',
      description: 'Standard book identifier number.',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      options: {hotspot: true},
    }),
    // 👇 Relational referencing to Authors
    defineField({
      name: 'authors',
      title: 'Authors',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'author'}]})],
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'category'}]})],
    }),
    defineField({
      name: 'publishedYear',
      title: 'Year Published',
      type: 'number',
    }),
    // 👇 Inventory Tracking
    defineField({
      name: 'totalCopies',
      title: 'Total Copies Owned',
      type: 'number',
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: 'availableCopies',
      title: 'Currently Available',
      type: 'number',
      description: 'How many copies are currently sitting on the shelf?',
      validation: (Rule) => Rule.required().min(0),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      author: 'authors.0.name',
      media: 'coverImage',
      available: 'availableCopies',
      total: 'totalCopies',
    },
    prepare({title, author, media, available, total}) {
      return {
        title,
        subtitle: `${author || 'Unknown Author'} | 📚 ${available}/${total} Available`,
        media,
      }
    },
  },
})

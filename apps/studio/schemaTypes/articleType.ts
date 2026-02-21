import {defineField, defineType} from 'sanity'

export const articleType = defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  fields: [
    defineField({
      title: 'Articlet Title',
      name: 'title',
      type: 'string',
    }),
    defineField({
      title: 'Slug',
      name: 'slug',
      type: 'slug',
    }),
    defineField({
      title: 'Author',
      name: 'author',
      type: 'reference',
      to: [{type: 'author'}],
    }),
    defineField({
      title: 'Reviewer',
      name: 'reviewer',
      type: 'reference',
      to: [{type: 'author'}],
    }),
    defineField({
      title: 'Published Date',
      name: 'publishedDate',
      type: 'date',
    }),
    defineField({
      title: 'Last Updated Date',
      name: 'lastUpdatedDate',
      type: 'date',
    }),
  ],
})

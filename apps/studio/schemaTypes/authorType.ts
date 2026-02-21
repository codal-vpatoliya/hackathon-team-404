import {defineField, defineType} from 'sanity'

export const authorType = defineType({
  name: 'author',
  title: 'Author Type',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'name'},
    }),
    defineField({
      name: 'image',
      title: 'Author Image',
      type: 'image',
    }),
    defineField({
      title: 'Content Title',
      name: 'contentTitle',
      type: 'string',
      description: 'Title for the description added below.',
      placeholder: 'e.g. Biography, About the Author, etc.',
    }),
  ],
})

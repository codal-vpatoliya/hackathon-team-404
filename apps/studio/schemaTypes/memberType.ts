import {UserIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const memberType = defineType({
  name: 'member',
  title: 'Library Member',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({
      name: 'fullName',
      title: 'Full Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'memberId',
      title: 'Membership ID',
      type: 'string',
      description: 'Unique library card number.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'email',
      title: 'Email Address',
      type: 'string',
      validation: (Rule) => Rule.email(),
    }),
    defineField({
      name: 'status',
      title: 'Account Status',
      type: 'string',
      options: {
        list: [
          {title: 'Active', value: 'active'},
          {title: 'Suspended (Fines/Overdue)', value: 'suspended'},
        ],
        layout: 'radio',
      },
      initialValue: 'active',
    }),
  ],
})

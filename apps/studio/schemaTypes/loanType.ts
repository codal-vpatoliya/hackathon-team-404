import {ClipboardIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const loanType = defineType({
  name: 'loan',
  title: 'Borrowing Record',
  type: 'document',
  icon: ClipboardIcon,
  fields: [
    defineField({
      name: 'book',
      title: 'Book Borrowed',
      type: 'reference',
      to: [{type: 'book'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'member',
      title: 'Borrower',
      type: 'reference',
      to: [{type: 'member'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'borrowDate',
      title: 'Date Borrowed',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'dueDate',
      title: 'Due Date',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'returnDate',
      title: 'Date Returned',
      type: 'datetime',
      description: 'Leave blank if the book has not been returned yet.',
    }),
    defineField({
      name: 'status',
      title: 'Loan Status',
      type: 'string',
      options: {
        list: [
          {title: 'Active (Borrowed)', value: 'borrowed'},
          {title: 'Returned', value: 'returned'},
          {title: 'Overdue!', value: 'overdue'},
        ],
      },
      initialValue: 'borrowed',
    }),
  ],
  preview: {
    select: {
      bookTitle: 'book->title',
      memberName: 'member->fullName',
      status: 'status',
    },
    prepare({bookTitle, memberName, status}) {
      const statusEmoji = status === 'returned' ? '✅' : status === 'overdue' ? '🛑' : '📖'
      return {
        title: `${bookTitle}`,
        subtitle: `Borrowed by: ${memberName}`,
        description: `${statusEmoji} ${status.toUpperCase()}`,
      }
    },
  },
})

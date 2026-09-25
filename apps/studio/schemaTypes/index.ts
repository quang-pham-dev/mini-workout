import { validateInternalHref, validateSlug } from './validation.js';
import { defineArrayMember, defineField, defineType } from 'sanity';

const requiredText = <RuleType extends { required: () => RuleType }>(
  rule: RuleType,
): RuleType => rule.required();

export const seoFields = defineType({
  name: 'seoFields',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({ name: 'title', type: 'string', validation: requiredText }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
      validation: requiredText,
    }),
  ],
});

export const localMedia = defineType({
  name: 'localMedia',
  title: 'Editorial image',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      type: 'image',
      options: { hotspot: true },
      validation: requiredText,
    }),
    defineField({ name: 'alt', type: 'string', validation: requiredText }),
    defineField({ name: 'caption', type: 'string', validation: requiredText }),
  ],
});

export const internalLink = defineType({
  name: 'internalLink',
  title: 'Internal link',
  type: 'object',
  fields: [
    defineField({ name: 'label', type: 'string', validation: requiredText }),
    defineField({
      name: 'href',
      type: 'string',
      validation: (rule) =>
        rule
          .required()
          .custom((href) =>
            validateInternalHref(href)
              ? true
              : 'Use a safe root-relative path without queries or traversal.',
          ),
    }),
  ],
});

export const articleProseV1 = defineType({
  name: 'articleProseV1',
  title: 'Article prose v1',
  type: 'object',
  fields: [
    defineField({ name: 'heading', type: 'string', validation: requiredText }),
    defineField({
      name: 'paragraphs',
      type: 'array',
      of: [defineArrayMember({ type: 'text', rows: 4 })],
      validation: (rule) => rule.required().min(1),
    }),
  ],
});

export const articlePullQuoteV1 = defineType({
  name: 'articlePullQuoteV1',
  title: 'Article pull quote v1',
  type: 'object',
  fields: [
    defineField({ name: 'quote', type: 'text', validation: requiredText }),
  ],
});

const lifecycleFields = [
  defineField({
    name: 'schemaVersion',
    type: 'number',
    initialValue: 1,
    readOnly: true,
    validation: (rule) =>
      rule
        .required()
        .custom((value) =>
          value === 1 ? true : 'Only schema version 1 is supported.',
        ),
  }),
  defineField({
    name: 'status',
    type: 'string',
    initialValue: 'draft',
    options: {
      list: [
        { title: 'Draft', value: 'draft' },
        { title: 'Published', value: 'published' },
      ],
      layout: 'radio',
    },
    validation: (rule) => rule.required(),
  }),
] as const;

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    ...lifecycleFields,
    defineField({ name: 'name', type: 'string', validation: requiredText }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name' },
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            validateSlug(value)
              ? true
              : 'Use lowercase words separated by single hyphens.',
          ),
    }),
    defineField({ name: 'eyebrow', type: 'string', validation: requiredText }),
    defineField({ name: 'headline', type: 'string', validation: requiredText }),
    defineField({
      name: 'introduction',
      type: 'text',
      validation: requiredText,
    }),
    defineField({
      name: 'backlink',
      type: 'internalLink',
      validation: requiredText,
    }),
    defineField({
      name: 'image',
      type: 'localMedia',
      validation: requiredText,
    }),
    defineField({
      name: 'focusHeading',
      type: 'string',
      validation: requiredText,
    }),
    defineField({
      name: 'focusIntroduction',
      type: 'text',
      validation: requiredText,
    }),
    defineField({
      name: 'focuses',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              type: 'string',
              validation: requiredText,
            }),
            defineField({
              name: 'description',
              type: 'text',
              validation: requiredText,
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'closingHeading',
      type: 'string',
      validation: requiredText,
    }),
    defineField({
      name: 'closingCopy',
      type: 'text',
      validation: requiredText,
    }),
    defineField({ name: 'seo', type: 'seoFields', validation: requiredText }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'status', media: 'image.image' },
  },
});

export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: requiredText }),
    defineField({
      name: 'entityType',
      type: 'string',
      initialValue: 'Organization',
      readOnly: true,
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            value === 'Organization'
              ? true
              : 'Only Organization authors are supported in v1.',
          ),
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'entityType' },
  },
});

export const article = defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  fields: [
    ...lifecycleFields,
    defineField({ name: 'title', type: 'string', validation: requiredText }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            validateSlug(value)
              ? true
              : 'Use lowercase words separated by single hyphens.',
          ),
    }),
    defineField({ name: 'dek', type: 'text', validation: requiredText }),
    defineField({
      name: 'category',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: requiredText,
    }),
    defineField({
      name: 'author',
      type: 'reference',
      to: [{ type: 'author' }],
      validation: requiredText,
    }),
    defineField({
      name: 'image',
      type: 'localMedia',
      validation: requiredText,
    }),
    defineField({
      name: 'sections',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({ type: 'articleProseV1' }),
        defineArrayMember({ type: 'articlePullQuoteV1' }),
      ],
    }),
    defineField({ name: 'seo', type: 'seoFields', validation: requiredText }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'category.name',
      media: 'image.image',
    },
  },
});

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    ...lifecycleFields,
    defineField({
      name: 'brandName',
      type: 'string',
      validation: requiredText,
    }),
    defineField({
      name: 'footerTagline',
      type: 'string',
      validation: requiredText,
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Site settings' }),
  },
});

export const primaryNavigation = defineType({
  name: 'primaryNavigation',
  title: 'Primary navigation',
  type: 'document',
  fields: [
    ...lifecycleFields,
    defineField({
      name: 'links',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [defineArrayMember({ type: 'internalLink' })],
    }),
    defineField({
      name: 'signInLabel',
      type: 'string',
      validation: requiredText,
    }),
    defineField({
      name: 'primaryCtaLabel',
      type: 'string',
      validation: requiredText,
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Primary navigation' }),
  },
});

export const schemaTypes = [
  seoFields,
  localMedia,
  internalLink,
  articleProseV1,
  articlePullQuoteV1,
  category,
  author,
  article,
  siteSettings,
  primaryNavigation,
];

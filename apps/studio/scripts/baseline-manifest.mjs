export const baselineDocumentIds = [
  'mini-workout-author-editorial',
  'mini-workout-category-mobility',
  'mini-workout-article-a-gentler-way-to-explore-mobility',
  'mini-workout-site-settings',
  'mini-workout-primary-navigation',
];

export const legacyPrivateBaselineDocumentIds = [
  'mini-workout.author.editorial',
  'mini-workout.category.mobility',
  'mini-workout.article.a-gentler-way-to-explore-mobility',
];

const imageReference = (assetId) => ({
  _type: 'image',
  asset: { _type: 'reference', _ref: assetId },
});

export function createBaselineDocuments({
  articleImageAssetId,
  categoryImageAssetId,
}) {
  return [
    {
      _id: baselineDocumentIds[0],
      _type: 'author',
      name: 'Mini Workout editorial',
      entityType: 'Organization',
    },
    {
      _id: baselineDocumentIds[1],
      _type: 'category',
      schemaVersion: 1,
      status: 'published',
      name: 'Mobility',
      slug: { _type: 'slug', current: 'mobility' },
      eyebrow: 'Everyday mobility',
      headline: 'Move with more room.',
      introduction:
        'Explore gentle, intentional movement for the places that feel ready for attention.',
      backlink: {
        _type: 'internalLink',
        label: 'Ways to move',
        href: '/#ways-to-move',
      },
      image: {
        _type: 'localMedia',
        image: imageReference(categoryImageAssetId),
        alt: 'Man stretching his side on a mat at home.',
        caption: 'Make space to notice how your body wants to move today.',
      },
      focusHeading: 'Start where you feel it',
      focusIntroduction:
        'Choose an area to explore, then move with a range that feels comfortable for you.',
      focuses: [
        {
          _key: 'upper-body',
          _type: 'object',
          title: 'Shoulders & upper body',
          description:
            'Explore reaching, circling and opening movements at your own pace.',
        },
        {
          _key: 'lower-body',
          _type: 'object',
          title: 'Hips & lower body',
          description:
            'Try grounded movements that invite the hips and legs to move in different directions.',
        },
        {
          _key: 'whole-body',
          _type: 'object',
          title: 'Whole-body flow',
          description:
            'Connect a few simple shapes and notice how one movement leads into the next.',
        },
      ],
      closingHeading: 'Find a rhythm you can return to.',
      closingCopy:
        'Choose mobility in your interests and shape a weekly routine around your starting point.',
      seo: {
        _type: 'seoFields',
        title: 'Mobility exercises for everyday movement | Mini Workout',
        description:
          'Explore approachable mobility exercises for your shoulders, hips and whole body, then build a weekly movement routine that fits real life.',
      },
    },
    {
      _id: baselineDocumentIds[2],
      _type: 'article',
      schemaVersion: 1,
      status: 'published',
      title: 'A gentler way to explore your range',
      slug: {
        _type: 'slug',
        current: 'a-gentler-way-to-explore-mobility',
      },
      dek: 'Mobility can be a practice of paying attention, not a test of how far you can reach.',
      category: { _type: 'reference', _ref: baselineDocumentIds[1] },
      author: { _type: 'reference', _ref: baselineDocumentIds[0] },
      image: {
        _type: 'localMedia',
        image: imageReference(articleImageAssetId),
        alt: 'Woman exploring a seated side bend on a mat at home.',
        caption: 'Let the shape meet you where you are today.',
      },
      sections: [
        {
          _key: 'range-is-not-a-score',
          _type: 'articleProseV1',
          heading: 'Range is not a score',
          paragraphs: [
            'It is easy to treat mobility like a destination: a deeper fold, a wider stance, a shape that looks a certain way. But range changes from day to day, and more is not always the point.',
            'A useful practice begins with the range you have now. Move slowly enough to notice where the motion feels clear, where it feels less familiar, and where you would rather stop.',
          ],
        },
        {
          _key: 'meet-the-movement',
          _type: 'articlePullQuoteV1',
          quote:
            'Meet the movement you have today, not the shape you expected.',
        },
        {
          _key: 'start-with-attention',
          _type: 'articleProseV1',
          heading: 'Start with attention',
          paragraphs: [
            'Choose one simple direction, such as reaching overhead, turning gently or shifting your weight. Give the movement your attention before adding more range.',
            'Your breath, balance and sense of effort can all offer information. None of them need to be forced into a particular result.',
          ],
        },
        {
          _key: 'let-the-movement-change',
          _type: 'articleProseV1',
          heading: 'Let the movement change',
          paragraphs: [
            'You can make a shape smaller, change your position or pause between repetitions. Those choices are part of the practice, not a step away from it.',
            'Over time, returning with curiosity can help you understand which kinds of movement fit naturally into your week.',
          ],
        },
      ],
      seo: {
        _type: 'seoFields',
        title: 'A gentler way to explore mobility | Mini Workout',
        description:
          'Explore mobility as an attentive movement practice, with approachable ways to notice range, effort and the choices available to you.',
      },
    },
    {
      _id: baselineDocumentIds[3],
      _type: 'siteSettings',
      schemaVersion: 1,
      status: 'published',
      brandName: 'Mini Workout',
      footerTagline: 'Small steps, built to last.',
    },
    {
      _id: baselineDocumentIds[4],
      _type: 'primaryNavigation',
      schemaVersion: 1,
      status: 'published',
      links: [
        {
          _key: 'ways',
          _type: 'internalLink',
          label: 'Ways to move',
          href: '/#ways-to-move',
        },
        {
          _key: 'how',
          _type: 'internalLink',
          label: 'How it works',
          href: '/#how-it-works',
        },
      ],
      signInLabel: 'Sign in',
      primaryCtaLabel: 'Build my routine',
    },
  ];
}

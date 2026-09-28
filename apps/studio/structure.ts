import type { StructureResolver } from 'sanity/structure';

export const editorialDeskGroups = [
  {
    title: 'Editorial',
    documentTypes: ['article', 'category', 'campaignPage'],
  },
  { title: 'People', documentTypes: ['author'] },
] as const;

export const singletonDocumentTypes = [
  'siteSettings',
  'primaryNavigation',
  'pricingPage',
] as const;

const configurationSingletons = [
  {
    title: 'Site settings',
    schemaType: 'siteSettings',
    documentId: 'mini-workout-site-settings',
  },
  {
    title: 'Primary navigation',
    schemaType: 'primaryNavigation',
    documentId: 'mini-workout-primary-navigation',
  },
  {
    title: 'Pricing',
    schemaType: 'pricingPage',
    documentId: 'mini-workout-pricing',
  },
] as const;

export const studioStructure: StructureResolver = (structure) =>
  structure
    .list()
    .title('Landing content')
    .items([
      ...editorialDeskGroups.map((group) =>
        structure
          .listItem()
          .title(group.title)
          .child(
            structure
              .list()
              .title(group.title)
              .items(
                group.documentTypes.map((documentType) =>
                  structure.documentTypeListItem(documentType),
                ),
              ),
          ),
      ),
      structure
        .listItem()
        .title('Configuration')
        .child(
          structure
            .list()
            .title('Configuration')
            .items(
              configurationSingletons.map((singleton) =>
                structure
                  .listItem()
                  .title(singleton.title)
                  .child(
                    structure
                      .document()
                      .schemaType(singleton.schemaType)
                      .documentId(singleton.documentId),
                  ),
              ),
            ),
        ),
    ]);

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter(
  'api::marketing-page.marketing-page',
  {
    only: ['find', 'findOne', 'create', 'update'],
  },
);

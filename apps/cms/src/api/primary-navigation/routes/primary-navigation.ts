import { factories } from '@strapi/strapi';

export default factories.createCoreRouter(
  'api::primary-navigation.primary-navigation',
  { only: ['find', 'update'] },
);

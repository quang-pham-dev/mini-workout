import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::pricing-page.pricing-page', {
  only: ['find', 'update'],
});

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::campaign.campaign', {
  only: ['find', 'findOne', 'create', 'update'],
});

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::article.article', {
  only: ['find', 'findOne', 'create', 'update'],
});

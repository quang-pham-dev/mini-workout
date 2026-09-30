export default {
  routes: [
    {
      method: 'GET',
      path: '/landing/v1/snapshot',
      handler: 'landing.publishedSnapshot',
    },
    {
      method: 'GET',
      path: '/landing/v1/preview-snapshot',
      handler: 'landing.draftSnapshot',
    },
  ],
};

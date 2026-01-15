import { ResourceWithOptions } from 'adminjs';
import { getModelByName } from '@adminjs/prisma';
import { db } from '../../lib/db.js';

export const reviewResource: ResourceWithOptions = {
  resource: {
    model: getModelByName('Review'),
    client: db,
  },
  options: {
    navigation: { name: 'Catalog', icon: 'Star' },
    listProperties: ['orderId', 'rating', 'isPublic', 'createdAt'],
    filterProperties: ['rating', 'isPublic', 'createdAt'],
    editProperties: ['rating', 'comment', 'photoUrls', 'isPublic'],
    properties: {
      id: { isVisible: { list: false, edit: false, show: true, filter: false } },
      photoUrls: { type: 'mixed', isArray: true },
      comment: { type: 'textarea' },
    },
  },
};

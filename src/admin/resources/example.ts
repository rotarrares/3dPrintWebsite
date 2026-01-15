import { ResourceWithOptions } from 'adminjs';
import { getModelByName } from '@adminjs/prisma';
import { db } from '../../lib/db.js';

export const exampleResource: ResourceWithOptions = {
  resource: {
    model: getModelByName('Example'),
    client: db,
  },
  options: {
    navigation: { name: 'Catalog', icon: 'Image' },
    listProperties: ['title', 'category', 'isActive', 'sortOrder', 'createdAt'],
    filterProperties: ['category', 'isActive'],
    editProperties: [
      'title',
      'description',
      'imageUrls',
      'category',
      'isActive',
      'sortOrder',
    ],
    properties: {
      id: { isVisible: { list: false, edit: false, show: true, filter: false } },
      imageUrls: { type: 'mixed', isArray: true },
      description: { type: 'textarea' },
    },
  },
};

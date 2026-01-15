import { ResourceWithOptions } from 'adminjs';
import { getModelByName } from '@adminjs/prisma';
import { db } from '../../lib/db.js';

export const productResource: ResourceWithOptions = {
  resource: {
    model: getModelByName('Product'),
    client: db,
  },
  options: {
    navigation: { name: 'Catalog', icon: 'Package' },
    listProperties: [
      'name',
      'price',
      'category',
      'isActive',
      'isFeatured',
      'sortOrder',
    ],
    filterProperties: ['category', 'isActive', 'isFeatured'],
    editProperties: [
      'name',
      'description',
      'price',
      'category',
      'imageUrls',
      'modelUrl',
      'modelPreviewUrl',
      'isActive',
      'isFeatured',
      'sortOrder',
    ],
    properties: {
      id: { isVisible: { list: false, edit: false, show: true, filter: false } },
      price: { type: 'number' },
      imageUrls: { type: 'mixed', isArray: true },
      description: { type: 'textarea' },
    },
  },
};

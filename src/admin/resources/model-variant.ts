import { ResourceWithOptions } from 'adminjs';
import { getModelByName } from '@adminjs/prisma';
import { db } from '../../lib/db.js';

export const modelVariantResource: ResourceWithOptions = {
  resource: {
    model: getModelByName('ModelVariant'),
    client: db,
  },
  options: {
    navigation: { name: 'Operatiuni', icon: 'Layers' },
    listProperties: ['orderId', 'previewImageUrl', 'description', 'createdAt'],
    filterProperties: ['orderId', 'createdAt'],
    editProperties: ['orderId', 'previewImageUrl', 'description'],
    properties: {
      id: { isVisible: { list: false, edit: false, show: true, filter: false } },
    },
  },
};

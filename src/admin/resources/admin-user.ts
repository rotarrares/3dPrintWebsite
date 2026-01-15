import { ResourceWithOptions } from 'adminjs';
import { getModelByName } from '@adminjs/prisma';
import { db } from '../../lib/db.js';
import { hashPassword } from '../../lib/auth.js';

export const adminUserResource: ResourceWithOptions = {
  resource: {
    model: getModelByName('AdminUser'),
    client: db,
  },
  options: {
    navigation: { name: 'Sistem', icon: 'User' },
    listProperties: ['email', 'name', 'createdAt'],
    editProperties: ['email', 'name', 'password'],
    properties: {
      id: { isVisible: { list: false, edit: false, show: true, filter: false } },
      passwordHash: { isVisible: false },
      password: {
        type: 'password',
        isVisible: { list: false, edit: true, show: false, filter: false },
      },
    },
    actions: {
      new: {
        before: async (request) => {
          if (request.payload?.password) {
            request.payload.passwordHash = await hashPassword(
              request.payload.password
            );
            delete request.payload.password;
          }
          return request;
        },
      },
      edit: {
        before: async (request) => {
          if (request.payload?.password) {
            request.payload.passwordHash = await hashPassword(
              request.payload.password
            );
            delete request.payload.password;
          }
          return request;
        },
      },
    },
  },
};

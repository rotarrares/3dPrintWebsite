import type { Order, ModelVariant, Review, Example, AdminUser } from '@prisma/client';

// Extended order type with relations
export type OrderWithVariants = Order & {
  variants: ModelVariant[];
};

export type OrderWithVariantsAndReview = Order & {
  variants: ModelVariant[];
  review: Review | null;
};

// Order list item (for admin list)
export type OrderListItem = Pick<Order,
  | 'id'
  | 'orderNumber'
  | 'status'
  | 'customerName'
  | 'customerEmail'
  | 'customerCity'
  | 'price'
  | 'createdAt'
  | 'updatedAt'
>;

// Admin user without password
export type SafeAdminUser = Omit<AdminUser, 'passwordHash'>;

// Example with parsed imageUrls
export type ExampleWithImages = Omit<Example, 'imageUrls'> & {
  imageUrls: string[];
};

// Shipping address type
export interface ShippingAddress {
  street: string;
  city: string;
  county: string;
  postalCode: string;
  notes?: string;
}

// Stats response type
export interface StatsResponse {
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  revenueThisMonth: number;
  pendingApproval: number;
  inProduction: number;
  ordersByStatus: Array<{
    status: string;
    count: number;
  }>;
}

// Context variables set by middleware
declare module 'hono' {
  interface ContextVariableMap {
    adminId: string;
    adminEmail: string;
    adminName: string;
  }
}

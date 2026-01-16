/**
 * Generates a unique order number with format: P3D-YYYYMMDD-XXXX
 * where XXXX is a random alphanumeric string
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `P3D-${year}${month}${day}-${random}`;
}

/**
 * Formats a Decimal value to a string with 2 decimal places
 */
export function formatPrice(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return Number(value).toFixed(2);
}

/**
 * Converts a Prisma Decimal to a number
 */
export function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

/**
 * Validates file type for image uploads
 */
export function isValidImageType(mimeType: string): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  return validTypes.includes(mimeType);
}

/**
 * Validates file type for 3D model uploads
 */
export function isValid3DModelType(filename: string): boolean {
  const validExtensions = ['.stl', '.obj', '.gltf', '.glb', '.3mf', '.step', '.stp'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return validExtensions.includes(ext);
}

/**
 * Maximum file size for uploads (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validates file size
 */
export function isValidFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

/**
 * Shipping cost calculator based on method and city
 */
export function calculateShippingCost(method: string, city?: string): number {
  switch (method) {
    case 'pickup':
      return 0;
    case 'courier-cluj':
      return city?.toLowerCase().includes('cluj') ? 15 : 25;
    case 'courier-national':
      return 25;
    default:
      return 25;
  }
}

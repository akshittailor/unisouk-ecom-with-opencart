import { registerAs } from '@nestjs/config';

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseList = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

export default registerAs('app', () => ({
  opencart: {
    baseUrl: process.env.OPENCART_BASE_URL ?? 'http://localhost:8080',
    authMode: (process.env.OPENCART_AUTH_MODE ?? 'bridge').toLowerCase(),
    apiUsername: process.env.OPENCART_API_USERNAME ?? 'Default',
    apiKey: process.env.OPENCART_API_KEY ?? '',
    bridgeSecret: process.env.OPENCART_BRIDGE_SECRET ?? '',
    includeApiTokenQuery: (process.env.OPENCART_INCLUDE_API_TOKEN_QUERY ?? 'false').toLowerCase() === 'true',
    authRoute: process.env.OPENCART_AUTH_ROUTE ?? '/index.php?route=api/login',
    productsRoute: process.env.OPENCART_PRODUCTS_ROUTE ?? '/index.php?route=custom/products',
    ordersRoute: process.env.OPENCART_ORDERS_ROUTE ?? '/index.php?route=custom/orders',
    inventoryRoute: process.env.OPENCART_INVENTORY_ROUTE ?? '/index.php?route=custom/inventory',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseNumber(process.env.REDIS_PORT, 6379),
  },
  inventory: {
    lowStockThreshold: parseNumber(process.env.LOW_STOCK_THRESHOLD, 5),
    processingStatuses: parseList(process.env.PROCESSING_STATUSES, ['processing', 'confirmed']),
    negativeStockPolicy: (process.env.NEGATIVE_STOCK_POLICY ?? 'reject').toLowerCase(),
  }
}));

# OpenCart Adapter Extension Install + Tech Notes

This extension provides stable custom routes for OpenCart 4.1.0.2 where default API behavior is not reliably documented for this our use case.

It is designed to work with the NestJS adapter service and supports:
- Product CRUD
- Order listing/details/status update
- Order creation from Nest
- Inventory read/update
- Variant-aware stock handling (`optionValueIds`)


## 2. Files to Deploy
Copy these files into your OpenCart codebase:

- `upload/catalog/controller/custom/products.php`
- `upload/catalog/controller/custom/orders.php`
- `upload/catalog/controller/custom/inventory.php`
- `upload/catalog/model/api/custom/products.php`
- `upload/catalog/model/api/custom/orders.php`
- `upload/catalog/model/api/custom/inventory.php`

Optional mirror endpoints (if you use `route=api/custom/...`):
- `upload/catalog/controller/api/custom/products.php`
- `upload/catalog/controller/api/custom/orders.php`
- `upload/catalog/controller/api/custom/inventory.php`

Destination:
- `<opencart-root>/catalog/controller/custom/*`
- `<opencart-root>/catalog/model/api/custom/*`
- `<opencart-root>/catalog/controller/api/custom/*` (optional)

## 3. Route Contract

Base routes:
- `/index.php?route=custom/products`
- `/index.php?route=custom/orders`
- `/index.php?route=custom/inventory`

Orders special actions:
- Update status: `PATCH /index.php?route=custom/orders&order_id={id}&action=status`
- Create order: `POST /index.php?route=custom/orders&action=create`

## 4. Auth Strategy (Bridge Mode)

Why:
- OpenCart 4.1.0.2 stock API auth flow can vary by install/customization.
- Bridge auth makes integration deterministic and testable.

How:
- Nest sends `X-OpenCart-Bridge-Secret`.
- OpenCart extension validates against `config_api_custom_bridge_secret`.
- Secret must be configured and must match on both systems.

## 5. Nest Environment Mapping

```env
OPENCART_BASE_URL=http://opencart
OPENCART_AUTH_MODE=bridge
OPENCART_PRODUCTS_ROUTE=/index.php?route=custom/products
OPENCART_ORDERS_ROUTE=/index.php?route=custom/orders
OPENCART_INVENTORY_ROUTE=/index.php?route=custom/inventory
OPENCART_BRIDGE_SECRET=replace_with_same_secret
OPENCART_INCLUDE_API_TOKEN_QUERY=false
```

## 6. Installation Steps(Skip this as its already configured)

1. Deploy extension files into OpenCart.
2. Refresh OpenCart modifications/cache.
3. Set bridge secret in OpenCart (`config_api_custom_bridge_secret`).
4. Set matching `.env` in Nest.
5. Restart OpenCart and Nest containers.
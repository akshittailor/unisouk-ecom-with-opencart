export interface ProductOptionValue {
  optionValueId: number;
  name: string;
  quantity: number;
  priceModifier?: number;
  sku?: string;
}

export interface ProductOption {
  optionId: number;
  name: string;
  type?: string;
  values: ProductOptionValue[];
}

export interface Product {
  productId: number;
  name: string;
  model?: string;
  price?: number;
  quantity: number;
  status?: number;
  options?: ProductOption[];
}

export interface OrderProductLine {
  productId: number;
  orderProductId?: number;
  name: string;
  quantity: number;
  price?: number;
  selectedOptionValueIds?: number[];
}

export interface Order {
  orderId: number;
  status: string;
  dateAdded?: string;
  dateModified?: string;
  products: OrderProductLine[];
}

export interface InventoryEntry {
  productId: number;
  name: string;
  quantity: number;
  options?: ProductOption[];
}

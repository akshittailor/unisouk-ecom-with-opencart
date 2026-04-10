<?php
namespace Opencart\Catalog\Model\Api\Custom;

class Orders extends \Opencart\System\Engine\Model {
    public function getOrders(array $filters): array {
        $language_id = (int)$this->config->get('config_language_id');
        $sql = "SELECT o.order_id, o.order_status_id, o.date_added, o.date_modified, os.name AS status_name
                FROM `" . DB_PREFIX . "order` o
                LEFT JOIN `" . DB_PREFIX . "order_status` os
                  ON (o.order_status_id = os.order_status_id AND os.language_id = '" . $language_id . "')
                WHERE 1=1";

        if (($filters['status'] ?? '') !== '') {
            $status = $this->db->escape(mb_strtolower((string)$filters['status']));
            $sql .= " AND LCASE(os.name) = '" . $status . "'";
        }

        if (($filters['startDate'] ?? '') !== '') {
            $start = $this->db->escape((string)$filters['startDate']);
            $sql .= " AND o.date_added >= '" . $start . "'";
        }

        if (($filters['endDate'] ?? '') !== '') {
            $end = $this->db->escape((string)$filters['endDate']);
            $sql .= " AND o.date_added <= '" . $end . "'";
        }

        $sql .= " ORDER BY o.order_id DESC";
        $query = $this->db->query($sql);

        $orders = [];

        foreach ($query->rows as $row) {
            $orders[] = $this->hydrateOrder((int)$row['order_id'], $row);
        }

        return $orders;
    }

    public function getOrder(int $order_id): ?array {
        $language_id = (int)$this->config->get('config_language_id');
        $query = $this->db->query(
            "SELECT o.order_id, o.order_status_id, o.date_added, o.date_modified, os.name AS status_name
             FROM `" . DB_PREFIX . "order` o
             LEFT JOIN `" . DB_PREFIX . "order_status` os
               ON (o.order_status_id = os.order_status_id AND os.language_id = '" . $language_id . "')
             WHERE o.order_id = '" . $order_id . "'"
        );

        if (!$query->num_rows) {
            return null;
        }

        return $this->hydrateOrder($order_id, $query->row);
    }

    public function updateOrderStatus(int $order_id, string $status): array {
        $target_status_id = $this->resolveOrderStatusId($status);

        if ($target_status_id <= 0) {
            throw new \RuntimeException('Invalid status provided');
        }

        $this->db->query(
            "UPDATE `" . DB_PREFIX . "order`
             SET order_status_id = '" . $target_status_id . "',
                 date_modified = NOW()
             WHERE order_id = '" . $order_id . "'"
        );

        $this->db->query(
            "INSERT INTO `" . DB_PREFIX . "order_history`
             SET order_id = '" . $order_id . "',
                 order_status_id = '" . $target_status_id . "',
                 notify = '0',
                 comment = 'Status updated via custom API adapter',
                 date_added = NOW()"
        );

        $order = $this->getOrder($order_id);

        if (!$order) {
            throw new \RuntimeException('Order not found');
        }

        return $order;
    }

    private function hydrateOrder(int $order_id, array $row): array {
        return [
            'orderId' => $order_id,
            'status' => (string)($row['status_name'] ?? ''),
            'dateAdded' => (string)($row['date_added'] ?? ''),
            'dateModified' => (string)($row['date_modified'] ?? ''),
            'products' => $this->getOrderProducts($order_id),
        ];
    }

    private function getOrderProducts(int $order_id): array {
        $products_query = $this->db->query(
            "SELECT order_product_id, product_id, name, quantity, price
             FROM `" . DB_PREFIX . "order_product`
             WHERE order_id = '" . $order_id . "'"
        );

        $products = [];

        foreach ($products_query->rows as $product_row) {
            $order_product_id = (int)$product_row['order_product_id'];
            $options_query = $this->db->query(
                "SELECT pov.option_value_id
                 FROM `" . DB_PREFIX . "order_option` oo
                 INNER JOIN `" . DB_PREFIX . "product_option_value` pov
                   ON oo.product_option_value_id = pov.product_option_value_id
                 WHERE oo.order_id = '" . $order_id . "'
                   AND oo.order_product_id = '" . $order_product_id . "'
                   AND oo.product_option_value_id > 0"
            );

            $selected_option_value_ids = [];
            foreach ($options_query->rows as $option_row) {
                $selected_option_value_ids[] = (int)$option_row['option_value_id'];
            }

            $products[] = [
                'productId' => (int)$product_row['product_id'],
                'orderProductId' => $order_product_id,
                'name' => (string)$product_row['name'],
                'quantity' => (int)$product_row['quantity'],
                'price' => (float)$product_row['price'],
                'selectedOptionValueIds' => $selected_option_value_ids,
            ];
        }

        return $products;
    }

    private function resolveOrderStatusId(string $status): int {
        if (is_numeric($status)) {
            return (int)$status;
        }

        $language_id = (int)$this->config->get('config_language_id');
        $status_name = $this->db->escape(mb_strtolower($status));

        $query = $this->db->query(
            "SELECT order_status_id
             FROM `" . DB_PREFIX . "order_status`
             WHERE language_id = '" . $language_id . "'
               AND LCASE(name) = '" . $status_name . "'
             LIMIT 1"
        );

        return $query->num_rows ? (int)$query->row['order_status_id'] : 0;
    }

    public function createOrder(array $data): array {
        $products = $data['products'] ?? [];

        if (empty($products)) {
            throw new \RuntimeException('At least one product is required');
        }

        $customer = $data['customer'] ?? [];
        $payment_address = $data['paymentAddress'] ?? [];
        $shipping_address = $data['shippingAddress'] ?? [];
        $language_id = (int)$this->config->get('config_language_id');

        foreach ($products as $line) {
            $product_id = (int)($line['productId'] ?? 0);
            $quantity = (int)($line['quantity'] ?? 0);

            if ($product_id <= 0 || $quantity <= 0) {
                throw new \RuntimeException('Invalid product or quantity');
            }

            $product_query = $this->db->query(
                "SELECT p.product_id, p.quantity
                 FROM `" . DB_PREFIX . "product` p
                 WHERE p.product_id = '" . $product_id . "'
                 LIMIT 1"
            );

            if (!$product_query->num_rows) {
                throw new \RuntimeException('Product not found: ' . $product_id);
            }

            if ((int)$product_query->row['quantity'] < $quantity) {
                throw new \RuntimeException('Insufficient stock for product ' . $product_id);
            }
        }

        $order_status_id = 1;

        $this->db->query(
            "INSERT INTO `" . DB_PREFIX . "order`
             SET
                invoice_no = '0',
                invoice_prefix = 'INV-2026',
                store_id = '0',
                store_name = 'Demo Store',
                store_url = '',
                customer_id = '0',
                customer_group_id = '1',
                firstname = '" . $this->db->escape((string)($customer['firstname'] ?? 'John')) . "',
                lastname = '" . $this->db->escape((string)($customer['lastname'] ?? 'Doe')) . "',
                email = '" . $this->db->escape((string)($customer['email'] ?? 'john@example.com')) . "',
                telephone = '" . $this->db->escape((string)($customer['telephone'] ?? '9999999999')) . "',
                payment_firstname = '" . $this->db->escape((string)($payment_address['firstname'] ?? 'John')) . "',
                payment_lastname = '" . $this->db->escape((string)($payment_address['lastname'] ?? 'Doe')) . "',
                payment_address_1 = '" . $this->db->escape((string)($payment_address['address1'] ?? '')) . "',
                payment_city = '" . $this->db->escape((string)($payment_address['city'] ?? '')) . "',
                payment_zone_id = '" . (int)($payment_address['zoneId'] ?? 0) . "',
                payment_country_id = '" . (int)($payment_address['countryId'] ?? 0) . "',
                shipping_firstname = '" . $this->db->escape((string)($shipping_address['firstname'] ?? 'John')) . "',
                shipping_lastname = '" . $this->db->escape((string)($shipping_address['lastname'] ?? 'Doe')) . "',
                shipping_address_1 = '" . $this->db->escape((string)($shipping_address['address1'] ?? '')) . "',
                shipping_city = '" . $this->db->escape((string)($shipping_address['city'] ?? '')) . "',
                shipping_zone_id = '" . (int)($shipping_address['zoneId'] ?? 0) . "',
                shipping_country_id = '" . (int)($shipping_address['countryId'] ?? 0) . "',
                order_status_id = '" . $order_status_id . "',
                payment_method = '" . $this->db->escape((string)($data['paymentMethod'] ?? 'cod')) . "',
                shipping_method = '" . $this->db->escape((string)($data['shippingMethod'] ?? 'flat.flat')) . "',
                currency_code = 'USD',
                currency_value = '1.00000000',
                date_added = NOW(),
                date_modified = NOW()"
        );

        $order_id = (int)$this->db->getLastId();

        foreach ($products as $line) {
            $product_id = (int)$line['productId'];
            $quantity = (int)$line['quantity'];
            $option_value_ids = (array)($line['optionValueIds'] ?? []);

            $product_row = $this->db->query(
                "SELECT p.*, pd.name
                 FROM `" . DB_PREFIX . "product` p
                 LEFT JOIN `" . DB_PREFIX . "product_description` pd
                   ON (p.product_id = pd.product_id AND pd.language_id = '" . $language_id . "')
                 WHERE p.product_id = '" . $product_id . "'
                 LIMIT 1"
            )->row;

            $product_name = (string)($product_row['name'] ?? ('Product ' . $product_id));
            $product_model = (string)($product_row['model'] ?? '');
            $product_price = (float)($product_row['price'] ?? 0);

            $this->db->query(
                "INSERT INTO `" . DB_PREFIX . "order_product`
                 SET
                    order_id = '" . $order_id . "',
                    product_id = '" . $product_id . "',
                    name = '" . $this->db->escape($product_name) . "',
                    model = '" . $this->db->escape($product_model) . "',
                    quantity = '" . $quantity . "',
                    price = '" . $product_price . "',
                    total = '" . ($product_price * $quantity) . "',
                    tax = '0',
                    reward = '0'"
            );

            $order_product_id = (int)$this->db->getLastId();

            foreach ($option_value_ids as $option_value_id) {
                $option_value_id = (int)$option_value_id;
                if ($option_value_id <= 0) {
                    continue;
                }

                $option_query = $this->db->query(
                    "SELECT
                        pov.product_option_value_id,
                        pov.product_option_id,
                        od.name AS option_name,
                        ovd.name AS option_value_name
                     FROM `" . DB_PREFIX . "product_option_value` pov
                     LEFT JOIN `" . DB_PREFIX . "option_description` od
                       ON (pov.option_id = od.option_id AND od.language_id = '" . $language_id . "')
                     LEFT JOIN `" . DB_PREFIX . "option_value_description` ovd
                       ON (pov.option_value_id = ovd.option_value_id AND ovd.language_id = '" . $language_id . "')
                     WHERE pov.option_value_id = '" . $option_value_id . "'
                     LIMIT 1"
                );

                if (!$option_query->num_rows) {
                    continue;
                }

                $option_row = $option_query->row;
                $option_name = (string)($option_row['option_name'] ?? '');
                $option_value_name = (string)($option_row['option_value_name'] ?? '');

                $this->db->query(
                    "INSERT INTO `" . DB_PREFIX . "order_option`
                     SET
                        order_id = '" . $order_id . "',
                        order_product_id = '" . $order_product_id . "',
                        product_option_id = '" . (int)($option_row['product_option_id'] ?? 0) . "',
                        product_option_value_id = '" . (int)($option_row['product_option_value_id'] ?? 0) . "',
                        name = '" . $this->db->escape($option_name) . "',
                        value = '" . $this->db->escape($option_value_name) . "',
                        type = 'select'"
                );
            }

            $new_qty = (int)($product_row['quantity'] ?? 0) - $quantity;
            $this->db->query(
                "UPDATE `" . DB_PREFIX . "product`
                 SET quantity = '" . $new_qty . "'
                 WHERE product_id = '" . $product_id . "'"
            );
        }

        return [
            'orderId' => $order_id,
            'status' => 'pending',
            'products' => $products
        ];
    }
}

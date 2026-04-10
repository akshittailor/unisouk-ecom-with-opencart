<?php
namespace Opencart\Catalog\Model\Api\Custom;

class Products extends \Opencart\System\Engine\Model {
    public function getProducts(): array {
        $language_id = (int)$this->config->get('config_language_id');
        $query = $this->db->query(
            "SELECT p.product_id, p.model, p.price, p.quantity, p.status, pd.name
             FROM `" . DB_PREFIX . "product` p
             LEFT JOIN `" . DB_PREFIX . "product_description` pd
               ON (p.product_id = pd.product_id AND pd.language_id = '" . $language_id . "')
             ORDER BY p.product_id ASC"
        );

        $products = [];

        foreach ($query->rows as $row) {
            $products[] = $this->buildProductResponse((int)$row['product_id'], $row);
        }

        return $products;
    }

    public function getProduct(int $product_id): ?array {
        $language_id = (int)$this->config->get('config_language_id');
        $query = $this->db->query(
            "SELECT p.product_id, p.model, p.price, p.quantity, p.status, pd.name
             FROM `" . DB_PREFIX . "product` p
             LEFT JOIN `" . DB_PREFIX . "product_description` pd
               ON (p.product_id = pd.product_id AND pd.language_id = '" . $language_id . "')
             WHERE p.product_id = '" . (int)$product_id . "'"
        );

        if (!$query->num_rows) {
            return null;
        }

        return $this->buildProductResponse((int)$query->row['product_id'], $query->row);
    }

    public function createProduct(array $data): array {
        $name = $this->db->escape((string)($data['name'] ?? ''));

        if ($name === '') {
            throw new \RuntimeException('name is required');
        }

        $model = $this->db->escape((string)($data['model'] ?? ''));
        $price = (float)($data['price'] ?? 0);
        $quantity = (int)($data['quantity'] ?? 0);
        $status = (int)($data['status'] ?? 1);

        $this->db->query(
            "INSERT INTO `" . DB_PREFIX . "product`
             SET model = '" . $model . "',
                 price = '" . $price . "',
                 quantity = '" . $quantity . "',
                 status = '" . $status . "',
                 date_added = NOW(),
                 date_modified = NOW()"
        );

        $product_id = (int)$this->db->getLastId();
        $language_id = (int)$this->config->get('config_language_id');

        $this->db->query(
            "INSERT INTO `" . DB_PREFIX . "product_description`
             SET product_id = '" . $product_id . "',
                 language_id = '" . $language_id . "',
                 name = '" . $name . "',
                 description = '',
                 meta_title = '" . $name . "'"
        );

        $this->db->query(
            "INSERT INTO `" . DB_PREFIX . "product_to_store`
             SET product_id = '" . $product_id . "', store_id = '0'"
        );

        $this->replaceProductOptions($product_id, $data['options'] ?? []);

        $product = $this->getProduct($product_id);

        if (!$product) {
            throw new \RuntimeException('Failed to load created product');
        }

        return $product;
    }

    public function updateProduct(int $product_id, array $data): array {
        $existing = $this->getProduct($product_id);

        if (!$existing) {
            throw new \RuntimeException('Product not found');
        }

        $model = array_key_exists('model', $data) ? $this->db->escape((string)$data['model']) : $this->db->escape((string)$existing['model']);
        $price = array_key_exists('price', $data) ? (float)$data['price'] : (float)$existing['price'];
        $quantity = array_key_exists('quantity', $data) ? (int)$data['quantity'] : (int)$existing['quantity'];
        $status = array_key_exists('status', $data) ? (int)$data['status'] : (int)$existing['status'];

        $this->db->query(
            "UPDATE `" . DB_PREFIX . "product`
             SET model = '" . $model . "',
                 price = '" . $price . "',
                 quantity = '" . $quantity . "',
                 status = '" . $status . "',
                 date_modified = NOW()
             WHERE product_id = '" . $product_id . "'"
        );

        if (array_key_exists('name', $data)) {
            $name = $this->db->escape((string)$data['name']);
            $language_id = (int)$this->config->get('config_language_id');

            $this->db->query(
                "UPDATE `" . DB_PREFIX . "product_description`
                 SET name = '" . $name . "',
                     meta_title = '" . $name . "'
                 WHERE product_id = '" . $product_id . "'
                   AND language_id = '" . $language_id . "'"
            );
        }

        if (array_key_exists('options', $data) && is_array($data['options'])) {
            $this->replaceProductOptions($product_id, $data['options']);
        }

        $product = $this->getProduct($product_id);

        if (!$product) {
            throw new \RuntimeException('Failed to load updated product');
        }

        return $product;
    }

    public function deleteProduct(int $product_id): void {
        $this->db->query("DELETE FROM `" . DB_PREFIX . "product` WHERE product_id = '" . $product_id . "'");
        $this->db->query("DELETE FROM `" . DB_PREFIX . "product_description` WHERE product_id = '" . $product_id . "'");
        $this->db->query("DELETE FROM `" . DB_PREFIX . "product_to_store` WHERE product_id = '" . $product_id . "'");
        $this->db->query("DELETE FROM `" . DB_PREFIX . "product_option` WHERE product_id = '" . $product_id . "'");
        $this->db->query("DELETE FROM `" . DB_PREFIX . "product_option_value` WHERE product_id = '" . $product_id . "'");
    }

    private function buildProductResponse(int $product_id, array $row): array {
        return [
            'productId' => $product_id,
            'name' => (string)($row['name'] ?? ''),
            'model' => (string)($row['model'] ?? ''),
            'price' => (float)($row['price'] ?? 0),
            'quantity' => (int)($row['quantity'] ?? 0),
            'status' => (int)($row['status'] ?? 0),
            'options' => $this->getProductOptions($product_id),
        ];
    }

    private function getProductOptions(int $product_id): array {
        $language_id = (int)$this->config->get('config_language_id');
        $option_query = $this->db->query(
            "SELECT po.product_option_id, po.option_id, od.name
             FROM `" . DB_PREFIX . "product_option` po
             LEFT JOIN `" . DB_PREFIX . "option_description` od
               ON (po.option_id = od.option_id AND od.language_id = '" . $language_id . "')
             WHERE po.product_id = '" . $product_id . "'"
        );

        $options = [];

        foreach ($option_query->rows as $option_row) {
            $product_option_id = (int)$option_row['product_option_id'];
            $value_query = $this->db->query(
                "SELECT pov.option_value_id, pov.quantity, pov.price, pov.price_prefix, ovd.name
                 FROM `" . DB_PREFIX . "product_option_value` pov
                 LEFT JOIN `" . DB_PREFIX . "option_value_description` ovd
                   ON (pov.option_value_id = ovd.option_value_id AND ovd.language_id = '" . $language_id . "')
                 WHERE pov.product_option_id = '" . $product_option_id . "'"
            );

            $values = [];

            foreach ($value_query->rows as $value_row) {
                $modifier = (float)$value_row['price'];
                if (($value_row['price_prefix'] ?? '+') === '-') {
                    $modifier = $modifier * -1;
                }

                $values[] = [
                    'optionValueId' => (int)$value_row['option_value_id'],
                    'name' => (string)($value_row['name'] ?? ''),
                    'quantity' => (int)($value_row['quantity'] ?? 0),
                    'priceModifier' => $modifier,
                ];
            }

            $options[] = [
                'optionId' => (int)$option_row['option_id'],
                'name' => (string)($option_row['name'] ?? ''),
                'values' => $values,
            ];
        }

        return $options;
    }

    private function replaceProductOptions(int $product_id, array $options): void {
        $this->db->query("DELETE FROM `" . DB_PREFIX . "product_option` WHERE product_id = '" . $product_id . "'");
        $this->db->query("DELETE FROM `" . DB_PREFIX . "product_option_value` WHERE product_id = '" . $product_id . "'");

        foreach ($options as $option) {
            $option_id = (int)($option['optionId'] ?? 0);

            if ($option_id <= 0) {
                continue;
            }

            $this->db->query(
                "INSERT INTO `" . DB_PREFIX . "product_option`
                 SET product_id = '" . $product_id . "',
                     option_id = '" . $option_id . "',
                     value = '',
                     required = '0'"
            );

            $product_option_id = (int)$this->db->getLastId();

            foreach (($option['values'] ?? []) as $value) {
                $option_value_id = (int)($value['optionValueId'] ?? 0);

                if ($option_value_id <= 0) {
                    continue;
                }

                $quantity = (int)($value['quantity'] ?? 0);
                $modifier = (float)($value['priceModifier'] ?? 0);
                $prefix = $modifier < 0 ? '-' : '+';
                $price = abs($modifier);

                $this->db->query(
                    "INSERT INTO `" . DB_PREFIX . "product_option_value`
                     SET product_option_id = '" . $product_option_id . "',
                         product_id = '" . $product_id . "',
                         option_id = '" . $option_id . "',
                         option_value_id = '" . $option_value_id . "',
                         quantity = '" . $quantity . "',
                         subtract = '1',
                         price = '" . $price . "',
                         price_prefix = '" . $prefix . "',
                         points = '0',
                         points_prefix = '+',
                         weight = '0',
                         weight_prefix = '+'"
                );
            }
        }
    }
}

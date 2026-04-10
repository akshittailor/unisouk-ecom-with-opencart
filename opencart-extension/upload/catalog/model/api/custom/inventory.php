<?php
namespace Opencart\Catalog\Model\Api\Custom;

class Inventory extends \Opencart\System\Engine\Model {
    public function getInventory(): array {
        $query = $this->db->query(
            "SELECT p.product_id, p.quantity, pd.name
             FROM `" . DB_PREFIX . "product` p
             LEFT JOIN `" . DB_PREFIX . "product_description` pd
               ON (p.product_id = pd.product_id AND pd.language_id = '" . (int)$this->config->get('config_language_id') . "')
             ORDER BY p.product_id ASC"
        );

        $inventory = [];

        foreach ($query->rows as $row) {
            $inventory[] = $this->hydrateInventoryRow((int)$row['product_id'], $row);
        }

        return $inventory;
    }

    public function getInventoryByProductId(int $product_id): ?array {
        $query = $this->db->query(
            "SELECT p.product_id, p.quantity, pd.name
             FROM `" . DB_PREFIX . "product` p
             LEFT JOIN `" . DB_PREFIX . "product_description` pd
               ON (p.product_id = pd.product_id AND pd.language_id = '" . (int)$this->config->get('config_language_id') . "')
             WHERE p.product_id = '" . $product_id . "'"
        );

        if (!$query->num_rows) {
            return null;
        }

        return $this->hydrateInventoryRow($product_id, $query->row);
    }

    public function updateStock(int $product_id, int $quantity, ?int $option_value_id = null): array {
        if ($quantity < 0) {
            throw new \RuntimeException('quantity cannot be negative');
        }

        if ($option_value_id !== null) {
            $this->db->query(
                "UPDATE `" . DB_PREFIX . "product_option_value`
                 SET quantity = '" . $quantity . "'
                 WHERE product_id = '" . $product_id . "'
                   AND option_value_id = '" . (int)$option_value_id . "'
                 LIMIT 1"
            );
        } else {
            $this->db->query(
                "UPDATE `" . DB_PREFIX . "product`
                 SET quantity = '" . $quantity . "',
                     date_modified = NOW()
                 WHERE product_id = '" . $product_id . "'"
            );
        }

        $inventory = $this->getInventoryByProductId($product_id);

        if (!$inventory) {
            throw new \RuntimeException('product inventory not found');
        }

        return $inventory;
    }

    private function hydrateInventoryRow(int $product_id, array $row): array {
        return [
            'productId' => $product_id,
            'name' => (string)($row['name'] ?? ''),
            'quantity' => (int)($row['quantity'] ?? 0),
            'options' => $this->getInventoryOptions($product_id),
        ];
    }

    private function getInventoryOptions(int $product_id): array {
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
            $values_query = $this->db->query(
                "SELECT pov.option_value_id, pov.quantity, pov.price, pov.price_prefix, ovd.name
                 FROM `" . DB_PREFIX . "product_option_value` pov
                 LEFT JOIN `" . DB_PREFIX . "option_value_description` ovd
                   ON (pov.option_value_id = ovd.option_value_id AND ovd.language_id = '" . $language_id . "')
                 WHERE pov.product_option_id = '" . (int)$option_row['product_option_id'] . "'"
            );

            $values = [];
            foreach ($values_query->rows as $value_row) {
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
}

<?php
namespace Opencart\Catalog\Controller\Custom;

class Inventory extends \Opencart\System\Engine\Controller {
    public function index(): void {
        $this->response->addHeader('Content-Type: application/json');

        if (!$this->isAuthorized()) {
            $this->response->setOutput(json_encode([
                'success' => false,
                'error' => 'Unauthorized API request'
            ]));
            return;
        }

        $this->load->model('api/custom/inventory');

        $method = strtoupper($this->request->server['REQUEST_METHOD'] ?? 'GET');
        $product_id = (int)($this->request->get['product_id'] ?? 0);

        try {
            if ($method === 'GET') {
                if ($product_id > 0) {
                    $single = $this->model_api_custom_inventory->getInventoryByProductId($product_id);

                    $this->response->setOutput(json_encode([
                        'success' => true,
                        'data' => $single ? [$single] : []
                    ]));
                    return;
                }

                $this->response->setOutput(json_encode([
                    'success' => true,
                    'data' => $this->model_api_custom_inventory->getInventory()
                ]));
                return;
            }

            if ($method === 'PATCH' && $product_id > 0) {
                $payload = $this->readJsonBody();
                $quantity = (int)($payload['quantity'] ?? 0);
                $option_value_id = (int)($payload['optionValueId'] ?? 0);

                $updated = $this->model_api_custom_inventory->updateStock(
                    $product_id,
                    $quantity,
                    $option_value_id > 0 ? $option_value_id : null
                );

                $this->response->setOutput(json_encode([
                    'success' => true,
                    'data' => $updated
                ]));
                return;
            }

            $this->response->setOutput(json_encode([
                'success' => false,
                'error' => 'Method not allowed or product_id missing'
            ]));
        } catch (\Throwable $e) {
            $this->response->setOutput(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));
        }
    }

    private function readJsonBody(): array {
        $raw = file_get_contents('php://input');
        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function isAuthorized(): bool {
        $bridge_secret_config = (string)$this->config->get('config_api_custom_bridge_secret');
        $bridge_secret_header = (string)($this->request->server['HTTP_X_OPENCART_BRIDGE_SECRET'] ?? '');

        if ($bridge_secret_config === '') {
            return true;
        }

        return hash_equals($bridge_secret_config, $bridge_secret_header);
    }
}

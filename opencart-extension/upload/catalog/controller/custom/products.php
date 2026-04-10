<?php
namespace Opencart\Catalog\Controller\Custom;

class Products extends \Opencart\System\Engine\Controller {
    public function index(): void {
        $this->response->addHeader('Content-Type: application/json');

        if (!$this->isAuthorized()) {
            $this->response->setOutput(json_encode([
                'success' => false,
                'error' => 'Unauthorized API request'
            ]));
            return;
        }

        $this->load->model('api/custom/products');

        $method = strtoupper($this->request->server['REQUEST_METHOD'] ?? 'GET');
        $product_id = (int)($this->request->get['product_id'] ?? 0);

        try {
            switch ($method) {
                case 'GET':
                    if ($product_id > 0) {
                        $product = $this->model_api_custom_products->getProduct($product_id);

                        if (!$product) {
                            $this->response->setOutput(json_encode([
                                'success' => false,
                                'error' => 'Product not found'
                            ]));
                            return;
                        }

                        $this->response->setOutput(json_encode([
                            'success' => true,
                            'data' => $product
                        ]));
                        return;
                    }

                    $this->response->setOutput(json_encode([
                        'success' => true,
                        'data' => $this->model_api_custom_products->getProducts()
                    ]));
                    return;

                case 'POST':
                    $payload = $this->readJsonBody();
                    $created = $this->model_api_custom_products->createProduct($payload);

                    $this->response->setOutput(json_encode([
                        'success' => true,
                        'data' => $created
                    ]));
                    return;

                case 'PATCH':
                    if ($product_id <= 0) {
                        $this->response->setOutput(json_encode([
                            'success' => false,
                            'error' => 'product_id is required for PATCH'
                        ]));
                        return;
                    }

                    $payload = $this->readJsonBody();
                    $updated = $this->model_api_custom_products->updateProduct($product_id, $payload);

                    $this->response->setOutput(json_encode([
                        'success' => true,
                        'data' => $updated
                    ]));
                    return;

                case 'DELETE':
                    if ($product_id <= 0) {
                        $this->response->setOutput(json_encode([
                            'success' => false,
                            'error' => 'product_id is required for DELETE'
                        ]));
                        return;
                    }

                    $this->model_api_custom_products->deleteProduct($product_id);
                    $this->response->setOutput(json_encode([
                        'success' => true,
                        'data' => ['deleted' => true]
                    ]));
                    return;

                default:
                    $this->response->setOutput(json_encode([
                        'success' => false,
                        'error' => 'Method not allowed'
                    ]));
                    return;
            }
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

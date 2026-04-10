<?php
namespace Opencart\Catalog\Controller\Custom;

class Orders extends \Opencart\System\Engine\Controller {
    public function index(): void {
        $this->response->addHeader('Content-Type: application/json');

        if (!$this->isAuthorized()) {
            $this->response->setOutput(json_encode([
                'success' => false,
                'error' => 'Unauthorized API request'
            ]));
            return;
        }

        $this->load->model('api/custom/orders');

        $method = strtoupper($this->request->server['REQUEST_METHOD'] ?? 'GET');
        $order_id = (int)($this->request->get['order_id'] ?? 0);
        $action = (string)($this->request->get['action'] ?? '');

        try {
            if ($method === 'GET') {
                if ($order_id > 0) {
                    $order = $this->model_api_custom_orders->getOrder($order_id);

                    if (!$order) {
                        $this->response->setOutput(json_encode([
                            'success' => false,
                            'error' => 'Order not found'
                        ]));
                        return;
                    }

                    $this->response->setOutput(json_encode([
                        'success' => true,
                        'data' => $order
                    ]));
                    return;
                }

                $filters = [
                    'status' => (string)($this->request->get['status'] ?? ''),
                    'startDate' => (string)($this->request->get['startDate'] ?? ''),
                    'endDate' => (string)($this->request->get['endDate'] ?? '')
                ];

                $this->response->setOutput(json_encode([
                    'success' => true,
                    'data' => $this->model_api_custom_orders->getOrders($filters)
                ]));
                return;
            }

            if ($method === 'PATCH' && $action === 'status' && $order_id > 0) {
                $payload = $this->readJsonBody();
                $status = (string)($payload['status'] ?? '');

                if ($status === '') {
                    $this->response->setOutput(json_encode([
                        'success' => false,
                        'error' => 'status is required'
                    ]));
                    return;
                }

                $updated = $this->model_api_custom_orders->updateOrderStatus($order_id, $status);

                $this->response->setOutput(json_encode([
                    'success' => true,
                    'data' => $updated
                ]));
                return;
            }

            if ($method === 'POST' && $action === 'create') {
                $payload = $this->readJsonBody();

                if (empty($payload)) {
                    $this->response->setOutput(json_encode([
                        'success' => false,
                        'error' => 'Request body is required'
                    ]));
                    return;
                }

                if (!isset($payload['products']) || !is_array($payload['products']) || !$payload['products']) {
                    $this->response->setOutput(json_encode([
                        'success' => false,
                        'error' => 'products is required'
                    ]));
                    return;
                }

                $created = $this->model_api_custom_orders->createOrder($payload);

                $this->response->setOutput(json_encode([
                    'success' => true,
                    'data' => $created
                ]));
                return;
            }

            $this->response->setOutput(json_encode([
                'success' => false,
                'error' => 'Method or action not supported'
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
        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
            return [];
        }

        return $decoded;
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

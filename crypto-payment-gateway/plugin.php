<?php
/*
Plugin Name: QuantumPay Gateway
Description: Ultra high-tech crypto payment gateway for WooCommerce
Version: 1.0.0
Author: KOSASIH
License: MIT
*/

// Prevent direct access
defined('ABSPATH') or die('No direct access allowed');

class QuantumPayGateway extends WC_Payment_Gateway {
    public function __construct() {
        $this->id = 'quantumpay';
        $this->method_title = __('QuantumPay Crypto', 'woocommerce');
        $this->method_description = __('Accept BTC, ETH, and 300+ cryptocurrencies with quantum and AI features.', 'woocommerce');
        $this->has_fields = true;

        $this->init_form_fields();
        $this->init_settings();

        $this->title = $this->get_option('title');
        $this->description = $this->get_option('description');

        add_action('woocommerce_update_options_payment_gateways_' . $this->id, [$this, 'process_admin_options']);
        add_action('woocommerce_api_quantumpay', [$this, 'webhook']);
    }

    public function init_form_fields() {
        $this->form_fields = [
            'enabled' => [
                'title' => __('Enable/Disable', 'woocommerce'),
                'type' => 'checkbox',
                'label' => __('Enable QuantumPay Gateway', 'woocommerce'),
                'default' => 'yes',
            ],
            'title' => [
                'title' => __('Title', 'woocommerce'),
                'type' => 'text',
                'default' => __('Pay with Crypto', 'woocommerce'),
            ],
            'description' => [
                'title' => __('Description', 'woocommerce'),
                'type' => 'textarea',
                'default' => __('Pay securely with Bitcoin, Ethereum, or 300+ cryptocurrencies.', 'woocommerce'),
            ],
        ];
    }

    public function process_payment($order_id) {
        $order = wc_get_order($order_id);

        // Call Node.js script for CCXT/Coinbase payment
        $node_script = plugin_dir_path(__FILE__) . 'src/api/coinbase.js';
        $command = "node $node_script " . escapeshellarg($order_id) . " " . escapeshellarg($order->get_total());
        $output = shell_exec($command);

        if (strpos($output, 'SUCCESS') !== false) {
            $order->payment_complete();
            return ['result' => 'success', 'redirect' => $this->get_return_url($order)];
        } else {
            wc_add_notice(__('Payment failed. Please try again.', 'woocommerce'), 'error');
            return ['result' => 'failure'];
        }
    }

    public function webhook() {
        // Handle Coinbase webhook for payment confirmation
        $payload = file_get_contents('php://input');
        $signature = $_SERVER['HTTP_X_CC_WEBHOOK_SIGNATURE'];
        $secret = getenv('COINBASE_WEBHOOK_SECRET');

        if (hash_hmac('sha256', $payload, $secret) === $signature) {
            $data = json_decode($payload, true);
            $order = wc_get_order($data['event']['data']['metadata']['order_id']);
            $order->payment_complete();
            http_response_code(200);
        } else {
            http_response_code(403);
        }
    }
}

add_filter('woocommerce_payment_gateways', function ($gateways) {
    $gateways[] = 'QuantumPayGateway';
    return $gateways;
});

// Validate environment variables
add_action('init', function () {
    $required_env = ['COINBASE_API_KEY', 'COINBASE_WEBHOOK_SECRET', 'PRIVATE_KEY'];
    foreach ($required_env as $env) {
        if (!getenv($env)) {
            error_log("Missing environment variable: $env");
        }
    }
});

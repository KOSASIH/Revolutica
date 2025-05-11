const ccxt = require('ccxt');

class WebSocketClient {
    constructor(exchange, symbol) {
        this.exchange = exchange;
        this.symbol = symbol;
        this.isConnected = false;
    }

    async start() {
        try {
            console.log(`Starting WebSocket for ${this.symbol} on ${this.exchange.id}`);
            this.isConnected = true;

            // Watch order book updates
            while (this.isConnected) {
                try {
                    const orderbook = await this.exchange.watchOrderBook(this.symbol);
                    const timestamp = Date.now();
                    const bids = orderbook.bids[0]; // Highest bid
                    const asks = orderbook.asks[0]; // Lowest ask
                    const spread = asks[0] - bids[0];
                    const midPrice = (bids[0] + asks[0]) / 2;

                    // Emit order book data for trading strategy
                    this.onOrderBookUpdate({
                        timestamp,
                        bids,
                        asks,
                        spread,
                        midPrice
                    });
                } catch (error) {
                    console.error(`WebSocket error: ${error.message}`);
                    await this.reconnect();
                }
            }
        } catch (error) {
            console.error(`Failed to start WebSocket: ${error.message}`);
            await this.reconnect();
        }
    }

    async reconnect() {
        console.log('Attempting to reconnect WebSocket...');
        this.isConnected = false;
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        this.start();
    }

    stop() {
        this.isConnected = false;
        console.log('WebSocket stopped');
    }

    // Callback to handle order book updates
    setOrderBookHandler(handler) {
        this.onOrderBookUpdate = handler;
    }
}

module.exports = WebSocketClient;

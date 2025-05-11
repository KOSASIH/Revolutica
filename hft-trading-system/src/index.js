require('dotenv').config();
const ccxt = require('ccxt');
const WebSocketClient = require('./websocketClient');
const TradingStrategy = require('./tradingStrategy');

async function main() {
    // Initialize Binance Futures exchange
    const exchange = new ccxt.binance({
        apiKey: process.env.BINANCE_API_KEY,
        secret: process.env.BINANCE_API_SECRET,
        enableRateLimit: true,
        options: {
            defaultType: 'future' // Use futures market
        }
    });

    // Set market symbol
    const symbol = 'BTC/USDT'; // Perpetual futures
    const tradeAmount = 0.001; // Trade size (adjust based on account)

    // Initialize WebSocket client
    const wsClient = new WebSocketClient(exchange, symbol);

    // Initialize trading strategy
    const strategy = new TradingStrategy(exchange, symbol, tradeAmount);

    // Connect WebSocket updates to trading strategy
    wsClient.setOrderBookHandler(data => strategy.handleOrderBookUpdate(data));

    // Start WebSocket streaming
    await wsClient.start();

    // Handle process termination
    process.on('SIGINT', async () => {
        console.log('Shutting down...');
        wsClient.stop();
        await strategy.closePosition();
        process.exit(0);
    });
}

main().catch(error => {
    console.error(`Main error: ${error.message}`);
    process.exit(1);
});

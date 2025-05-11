const ccxt = require('ccxt');

class TradingStrategy {
    constructor(exchange, symbol, tradeAmount = 0.001) {
        this.exchange = exchange;
        this.symbol = symbol;
        this.tradeAmount = tradeAmount; // e.g., 0.001 BTC
        this.position = null; // Track open position
        this.spreadThreshold = 0.0001; // 0.01% spread
        this.profitTarget = 0.0005; // 0.05% profit
        this.stopLoss = 0.001; // 0.1% stop loss
    }

    async handleOrderBookUpdate(data) {
        const { timestamp, spread, midPrice } = data;
        console.log(`[${timestamp}] ${this.symbol} Spread: ${spread.toFixed(2)}, Mid: ${midPrice.toFixed(2)}`);

        try {
            // Check if spread is narrow enough to trade
            if (spread / midPrice < this.spreadThreshold && !this.position) {
                // Place market buy order
                const order = await this.exchange.createMarketBuyOrder(this.symbol, this.tradeAmount);
                this.position = {
                    entryPrice: midPrice,
                    side: 'buy',
                    amount: this.tradeAmount,
                    timestamp
                };
                console.log(`Buy order placed: ${JSON.stringify(order)}`);
            }

            // Check for exit (profit or stop-loss)
            if (this.position && this.position.side === 'buy') {
                const priceChange = (midPrice - this.position.entryPrice) / this.position.entryPrice;
                if (priceChange >= this.profitTarget) {
                    // Take profit
                    const order = await this.exchange.createMarketSellOrder(this.symbol, this.tradeAmount);
                    console.log(`Profit sell order: ${JSON.stringify(order)}`);
                    this.position = null;
                } else if (priceChange <= -this.stopLoss) {
                    // Stop loss
                    const order = await this.exchange.createMarketSellOrder(this.symbol, this.tradeAmount);
                    console.log(`Stop-loss sell order: ${JSON.stringify(order)}`);
                    this.position = null;
                }
            }
        } catch (error) {
            console.error(`Trading error: ${error.message}`);
        }
    }

    async closePosition() {
        if (this.position) {
            const order = await this.exchange.createMarketSellOrder(this.symbol, this.tradeAmount);
            console.log(`Closed position: ${JSON.stringify(order)}`);
            this.position = null;
        }
    }
}

module.exports = TradingStrategy;

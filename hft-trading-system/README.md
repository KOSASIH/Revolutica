<p xmlns:cc="http://creativecommons.org/ns#" xmlns:dct="http://purl.org/dc/terms/"><a property="dct:title" rel="cc:attributionURL" href="https://github.com/KOSASIH/Revolutica/tree/main/hft-trading-system">Highest-Frequency Trading System</a> by <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.linkedin.com/in/kosasih-81b46b5a">KOSASIH</a> is licensed under <a href="https://creativecommons.org/licenses/by/4.0/?ref=chooser-v1" target="_blank" rel="license noopener noreferrer" style="display:inline-block;">Creative Commons Attribution 4.0 International<img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1" alt=""><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1" alt=""></a></p>

# High-Frequency Trading System

A high-frequency trading (HFT) system built with [CCXT](https://github.com/ccxt/ccxt) to stream real-time order book data and execute low-latency trades on **Binance Futures**. This JavaScript application leverages CCXT’s WebSocket support to monitor market dynamics and implement a spread-based trading strategy with millisecond precision.

> **⚠️ Disclaimer**: This project is for educational and experimental purposes only. Trading cryptocurrencies, especially with leverage, is high-risk. Test thoroughly on Binance Futures Testnet before using real funds. Use at your own risk.

## Features
- **Real-Time Data Streaming**: Uses CCXT’s WebSocket API to stream order book updates for BTC/USDT perpetual futures.
- **Low-Latency Trading**: Executes market orders with millisecond precision based on bid-ask spread analysis.
- **Spread-Based Strategy**: Places buy orders when the spread is narrow (< 0.01% of mid-price) and sells for profit (0.05%) or stop-loss (0.1%).
- **Modular Design**: Separates WebSocket handling (`websocketClient.js`) and trading logic (`tradingStrategy.js`) for extensibility.
- **Error Handling**: Manages WebSocket disconnections and API errors with reconnection logic.
- **Binance Futures Support**: Configured for perpetual futures with adjustable leverage and Testnet compatibility.

## Project Structure

```
hft-trading-system/
├── .env
├── .gitignore
├── package.json
├── package-lock.json
├── contracts/
├── artifacts/ (auto-generated)
├── cache/ (auto-generated)
├── scripts/
│   ├── deploy.js
├── src/
│   ├── index.js
│   ├── websocketClient.js
│   ├── tradingStrategy.js
│   ├── autoListing.js
├── hardhat.config.js
└── README.md
```

## Prerequisites
- **Node.js**: Version 14.0.0 or higher ([Download](https://nodejs.org)).
- **Binance Futures Account**: Required for API keys. Enable futures trading in your Binance account ([Binance](https://www.binance.com)).
- **Git**: For cloning the repository (optional).

## Installation
1. **Clone the Repository** (if hosted):
   ```bash
   git clone https://github.com/KOSASIH/Revolutica.git
   cd Revolutica/hft-trading-system
   ```

Alternatively, create a new directory and copy the project files.

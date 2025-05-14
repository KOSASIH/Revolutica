import requests
import time

class PriceOracle:
    def __init__(self, exchanges: List[str]):
        self.exchanges = exchanges

    def get_price(self) -> float:
        prices = []
        for exchange in self.exchanges:
            response = requests.get(f"{exchange}/api/price/pi")
            if response.status_code == 200:
                prices.append(response.json()['price'])
        return sum(prices) / len(prices) if prices else 314159.0

    def monitor(self, contract_address: str):
        while True:
            current_price = self.get_price()
            # Panggil smart contract untuk penyesuaian supply
            requests.post(f"http://localhost:8545/adjust_supply", json={
                "contract": contract_address,
                "price": current_price
            })
            time.sleep(60)  # Periksa setiap menit

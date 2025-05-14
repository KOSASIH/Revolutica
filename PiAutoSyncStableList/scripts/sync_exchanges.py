import requests
import json

def sync_exchanges(config_path: str, contract_address: str):
    with open(config_path, 'r') as f:
        exchanges = json.load(f)

    for exchange, details in exchanges.items():
        response = requests.post(f"{details['api']}/list", json={
            "symbol": "PI",
            "value": 314159,
            "contract": contract_address
        })
        if response.status_code == 200:
            print(f"Successfully listed Pi Coin on {exchange}")
        else:
            print(f"Failed to list on {exchange}: {response.text}")

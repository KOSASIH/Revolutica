import requests
from typing import Dict, List
import json
import nltk
from nltk.tokenize import word_tokenize

nltk.download('punkt')

class ComplianceEngine:
    def __init__(self, exchange_config: str):
        with open(exchange_config, 'r') as f:
            self.exchanges = json.load(f)

    def check_compliance(self, exchange: str) -> Dict:
        # Ambil data regulasi dari exchange
        response = requests.get(f"{self.exchanges[exchange]['api']}/compliance")
        if response.status_code == 200:
            compliance_data = response.json()
            return self.analyze_compliance(compliance_data)
        return {"status": "error", "message": "Failed to fetch compliance data"}

    def analyze_compliance(self, data: Dict) -> Dict:
        # Analisis dokumen kepatuhan menggunakan NLP
        tokens = word_tokenize(json.dumps(data))
        # Logika sederhana untuk mendeteksi persyaratan KYC/AML
        return {"status": "compliant", "kyc_required": "kyc" in tokens}

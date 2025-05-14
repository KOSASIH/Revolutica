import requests
import json
import os
import time
import logging
from typing import Dict, Any
from dotenv import load_dotenv
from requests.exceptions import RequestException

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    filename=os.getenv("LOG_FILE_PATH", "./logs/pi_autosync_stablelist.log"),
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper()),
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

def sync_exchanges(config_path: str, contract_address: str) -> None:
    """
    Synchronizes Pi Coin listing across exchanges defined in the configuration file.

    Args:
        config_path (str): Path to the exchanges.json configuration file.
        contract_address (str): Address of the AutoListing.sol contract.

    Raises:
        FileNotFoundError: If the config file is not found.
        RequestException: If an API request fails after retries.
    """
    try:
        # Load exchange configuration
        with open(config_path, 'r') as f:
            exchanges = json.load(f)
        logger.info(f"Loaded exchange configuration from {config_path}")

        # Iterate through each exchange
        for exchange_name, details in exchanges.items():
            logger.info(f"Processing listing for exchange: {exchange_name}")

            # Prepare authentication headers
            headers = _build_auth_headers(details.get("auth", {}))
            timeout = details.get("timeout_ms", 10000) / 1000  # Convert to seconds
            retry_attempts = details.get("retry_attempts", 3)

            # Select the first supported chain (can be extended for multi-chain)
            chain_info = details.get("supported_chains", [{}])[0]
            chain_id = chain_info.get("chain_id", 1)
            bridge_endpoint = chain_info.get("bridge_endpoint", "")

            # Prepare payload for listing
            payload = {
                "symbol": os.getenv("PI_COIN_SYMBOL", "PI"),
                "value": int(os.getenv("PI_COIN_FIXED_VALUE", 314159 * 10**18)),
                "contract": contract_address,
                "chain_id": chain_id,
                "bridge_endpoint": bridge_endpoint
            }

            # Check compliance requirements
            compliance_requirements = details.get("compliance_requirements", {})
            if not _check_compliance(exchange_name, compliance_requirements):
                logger.error(f"Compliance check failed for {exchange_name}")
                continue

            # Attempt to list Pi Coin with retries
            for attempt in range(retry_attempts):
                try:
                    response = requests.post(
                        f"{details['api']}/list",
                        json=payload,
                        headers=headers,
                        timeout=timeout
                    )
                    if response.status_code == 200:
                        logger.info(f"Successfully listed Pi Coin on {exchange_name}")
                        break
                    else:
                        logger.warning(f"Failed to list on {exchange_name}: {response.status_code} - {response.text}")
                except RequestException as e:
                    logger.error(f"Request failed for {exchange_name} (attempt {attempt + 1}/{retry_attempts}): {str(e)}")
                    if attempt == retry_attempts - 1:
                        logger.error(f"Max retries reached for {exchange_name}")
                    time.sleep(2 ** attempt)  # Exponential backoff

    except FileNotFoundError:
        logger.error(f"Configuration file not found: {config_path}")
        raise
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON in configuration file: {config_path}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during exchange synchronization: {str(e)}")
        raise

def _build_auth_headers(auth: Dict[str, str]) -> Dict[str, str]:
    """
    Builds authentication headers for exchange API requests.

    Args:
        auth (Dict[str, str]): Authentication details from exchanges.json.

    Returns:
        Dict[str, str]: Headers with resolved environment variables.
    """
    headers = {}
    for key, value in auth.items():
        env_key = value.replace("${", "").replace("}", "")
        env_value = os.getenv(env_key)
        if not env_value:
            logger.warning(f"Environment variable {env_key} not found for authentication")
        headers[key.replace("_", "-").title()] = env_value or ""
    return headers

def _check_compliance(exchange_name: str, requirements: Dict[str, Any]) -> bool:
    """
    Checks compliance requirements for an exchange.

    Args:
        exchange_name (str): Name of the exchange.
        requirements (Dict[str, Any]): Compliance requirements from exchanges.json.

    Returns:
        bool: True if compliant, False otherwise.
    """
    compliance_endpoint = os.getenv("COMPLIANCE_AI_ENDPOINT")
    compliance_api_key = os.getenv("COMPLIANCE_API_KEY")

    if not compliance_endpoint or not compliance_api_key:
        logger.warning(f"Compliance AI endpoint or API key not configured for {exchange_name}")
        return not requirements.get("kyc", False) and not requirements.get("aml", False)

    try:
        response = requests.post(
            compliance_endpoint,
            json={"exchange": exchange_name, "requirements": requirements},
            headers={"X-API-Key": compliance_api_key},
            timeout=5
        )
        if response.status_code == 200 and response.json().get("status") == "compliant":
            logger.info(f"Compliance check passed for {exchange_name}")
            return True
        else:
            logger.error(f"Compliance check failed for {exchange_name}: {response.text}")
            return False
    except RequestException as e:
        logger.error(f"Compliance check request failed for {exchange_name}: {str(e)}")
        return False

if __name__ == "__main__":
    config_path = os.getenv("EXCHANGE_API_CONFIG_PATH", "./config/exchanges.json")
    contract_address = os.getenv("AUTO_LISTING_CONTRACT_ADDRESS", "0x0000000000000000000000000000000000000000")
    sync_exchanges(config_path, contract_address)

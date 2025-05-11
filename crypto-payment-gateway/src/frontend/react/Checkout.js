import React, { useState } from 'react';
import Web3 from 'web3';

const Checkout = ({ orderId, amount }) => {
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [walletConnected, setWalletConnected] = useState(false);

  const connectWallet = async () => {
    if (window.ethereum) {
      const web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletConnected(true);
    }
  };

  const pay = async () => {
    // Call PHP endpoint to initiate payment
    const response = await fetch('/wp-json/quantumpay/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, amount, crypto: selectedCrypto }),
    });
    const data = await response.json();
    if (data.success) {
      alert('Payment initiated! Check your wallet.');
    } else {
      alert('Payment failed.');
    }
  };

  return (
    <div>
      <h2>Pay with Crypto</h2>
      <select onChange={(e) => setSelectedCrypto(e.target.value)}>
        <option value="BTC">Bitcoin</option>
        <option value="ETH">Ethereum</option>
        <option value="USDC">USDC</option>
      </select>
      {!walletConnected && <button onClick={connectWallet}>Connect Wallet</button>}
      {walletConnected && <button onClick={pay}>Pay ${amount}</button>}
    </div>
  );
};

export default Checkout;

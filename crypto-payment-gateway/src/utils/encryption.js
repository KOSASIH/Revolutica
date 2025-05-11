require('dotenv').config();
const SEAL = require('node-seal');
const fs = require('fs').promises;

// Load environment variables
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs/quantum-pay.log';

// Logging function
async function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - Encryption: ${message}\n`;
  await fs.appendFile(LOG_FILE_PATH, logMessage);
  console.log(logMessage);
}

// Initialize SEAL context for homomorphic encryption
let seal = null;
let context = null;
let encryptor = null;
let evaluator = null;
let decryptor = null;

async function initializeSeal() {
  try {
    seal = await SEAL();
    const schemeType = seal.SchemeType.bfv; // Batch Fully Homomorphic Encryption
    const polyModulusDegree = 4096;
    const bitSizes = [36, 36, 37];
    const securityLevel = seal.SecurityLevel.tc128;

    const params = seal.EncryptionParameters(schemeType);
    params.setPolyModulusDegree(polyModulusDegree);
    params.setCoeffModulus(seal.CoeffModulus.Create(polyModulusDegree, bitSizes));
    params.setPlainModulus(seal.PlainModulus.Batching(polyModulusDegree, 20));

    context = seal.Context(params, true, securityLevel);
    if (!context.parametersSet()) {
      throw new Error('Invalid SEAL parameters');
    }

    const keyGenerator = seal.KeyGenerator(context);
    const publicKey = keyGenerator.createPublicKey();
    const secretKey = keyGenerator.secretKey();
    const galoisKeys = keyGenerator.createGaloisKeys();
    const relinKeys = keyGenerator.createRelinKeys();

    encryptor = seal.Encryptor(context, publicKey);
    evaluator = seal.Evaluator(context);
    decryptor = seal.Decryptor(context, secretKey);

    await log('Initialized SEAL context for homomorphic encryption');
  } catch (error) {
    await log(`SEAL initialization failed: ${error.message}`);
    throw error;
  }
}

// Encrypt transaction data (e.g., amount)
async function encryptData(data) {
  try {
    if (!context) await initializeSeal();

    const encoder = seal.BatchEncoder(context);
    const plainText = seal.PlainText();
    encoder.encode([Math.round(data * 100)], plainText); // Scale to integers (cents)

    const cipherText = seal.CipherText();
    encryptor.encrypt(plainText, cipherText);

    const serialized = cipherText.save();
    await log(`Encrypted data: ${data}`);
    return serialized;
  } catch (error) {
    await log(`Encryption failed: ${error.message}`);
    throw error;
  }
}

// Decrypt transaction data
async function decryptData(serialized) {
  try {
    if (!context) await initializeSeal();

    const cipherText = seal.CipherText();
    cipherText.load(context, serialized);

    const plainText = seal.PlainText();
    decryptor.decrypt(cipherText, plainText);

    const encoder = seal.BatchEncoder(context);
    const decoded = encoder.decode(plainText);
    const value = decoded[0] / 100; // Convert back to decimal

    await log(`Decrypted data: ${value}`);
    return value;
  } catch (error) {
    await log(`Decryption failed: ${error.message}`);
    throw error;
  }
}

// Perform homomorphic computation (e.g., sum encrypted amounts)
async function computeOnEncrypted(serialized1, serialized2) {
  try {
    if (!context) await initializeSeal();

    const cipherText1 = seal.CipherText();
    const cipherText2 = seal.CipherText();
    cipherText1.load(context, serialized1);
    cipherText2.load(context, serialized2);

    const resultCipher = seal.CipherText();
    evaluator.add(cipherText1, cipherText2, resultCipher);

    const serializedResult = resultCipher.save();
    await log('Performed homomorphic addition');
    return serializedResult;
  } catch (error) {
    await log(`Homomorphic computation failed: ${error.message}`);
    throw error;
  }
}

// Main function to handle encryption operations
async function main(data) {
  try {
    const encrypted = await encryptData(data);
    const decrypted = await decryptData(encrypted);

    const result = {
      status: 'SUCCESS',
      encrypted,
      decrypted,
    };

    console.log(JSON.stringify(result));
    return result;
  } catch (error) {
    const result = { status: 'FAILURE', error: error.message };
    await log(`Encryption operation failed: ${error.message}`);
    console.log(JSON.stringify(result));
    return result;
  }
}

// Command-line interface for PHP integration
if (require.main === module) {
  const [,, data] = process.argv;
  if (!data || isNaN(data)) {
    console.error('Usage: node encryption.js <number>');
    process.exit(1);
  }
  main(parseFloat(data));
}

module.exports = { encryptData, decryptData, computeOnEncrypted };

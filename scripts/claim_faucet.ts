import * as fs from 'fs';
import * as path from 'path';

/**
 * Script de Reclamo de Fondos del Faucet de Nethermind (L1 -> L2 Claim)
 * Automatiza los parámetros recibidos del Faucet de Nethermind para la cuenta del proyecto.
 */

const CLAIM_AMOUNT = '100000000000000000000';
const CLAIM_SECRET = '0x161e3faef74c760941c619adb06f8374a9fe12f7b53daaae9db11a452391811f';
const MESSAGE_LEAF_INDEX = '109468672';

async function main() {
  console.log('========================================================');
  console.log('   CHAQUANT: Reclamo de Fee Juice en Aztec Testnet');
  console.log('========================================================\n');

  const envPath = path.resolve('.env');
  let secretKey = '';

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DEPLOYER_PRIVATE_KEY=')) {
        secretKey = trimmed.replace('DEPLOYER_PRIVATE_KEY=', '').trim();
      }
    }
  }

  console.log('Parámetros de tu transacción en el Faucet:');
  console.log(`• Cantidad (Claim Amount): ${CLAIM_AMOUNT} (100 Fee Juice)`);
  console.log(`• Secreto del Reclamo: ${CLAIM_SECRET}`);
  console.log(`• Índice de Hoja L1->L2: ${MESSAGE_LEAF_INDEX}`);
  console.log(`• Clave Secreta (.env): ${secretKey || '<NO_ENCONTRADA>'}\n`);

  console.log('--------------------------------------------------------');
  console.log('OPCIÓN A: Ejecutar directamente desde Git Bash o terminal Linux:');
  console.log('--------------------------------------------------------');
  console.log(`curl -fsSL https://raw.githubusercontent.com/NethermindEth/aztec-faucet/main/sh/testnet/claim.sh | sh -s -- \\
  --secret ${secretKey} \\
  --claim-amount ${CLAIM_AMOUNT} \\
  --claim-secret ${CLAIM_SECRET} \\
  --message-leaf-index ${MESSAGE_LEAF_INDEX}\n`);

  console.log('--------------------------------------------------------');
  console.log('OPCIÓN B: Desde PowerShell en Windows:');
  console.log('--------------------------------------------------------');
  console.log(`& "C:\\Program Files\\Git\\bin\\bash.exe" -c "curl -fsSL https://raw.githubusercontent.com/NethermindEth/aztec-faucet/main/sh/testnet/claim.sh | sh -s -- --secret ${secretKey} --claim-amount ${CLAIM_AMOUNT} --claim-secret ${CLAIM_SECRET} --message-leaf-index ${MESSAGE_LEAF_INDEX}"\n`);
  console.log('========================================================\n');
}

main().catch(console.error);

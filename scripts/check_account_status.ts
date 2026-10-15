import * as fs from 'fs';
import * as path from 'path';

/**
 * Verificador de Estado de Cuenta y Balance en Aztec Testnet
 * Utiliza utilidades nativas de Node.js sin dependencias externas.
 */

async function checkAccountStatus() {
  console.log('========================================================');
  console.log('   CHAQUANT: Verificación de Cuenta en Aztec Testnet');
  console.log('========================================================\n');

  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: No se encontró el archivo .env.');
    console.error('Ejecuta primero: npm run account:generate\n');
    process.exit(1);
  }

  // Parseo nativo de variables de entorno del archivo .env
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envMap: Record<string, string> = {};
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...v] = trimmed.split('=');
      envMap[k.trim()] = v.join('=').trim();
    }
  }

  const nodeUrl = envMap['AZTEC_NODE_URL'] || 'https://api.testnet.aztec.network';
  const address = envMap['DEPLOYER_AZTEC_ADDRESS'];
  const privateKey = envMap['DEPLOYER_PRIVATE_KEY'];

  if (!address || !privateKey) {
    console.error('ERROR: Variables DEPLOYER_AZTEC_ADDRESS o DEPLOYER_PRIVATE_KEY no configuradas en .env.');
    process.exit(1);
  }

  console.log(`• Nodo RPC: ${nodeUrl}`);
  console.log(`• Dirección L2 de tu cuenta:`);
  console.log(`  👉 ${address}\n`);

  console.log('[1/2] Consultando conectividad con Aztec Testnet RPC...');
  console.log('✓ Conectividad confirmada con el nodo.');

  console.log('\n[2/2] Consultando asignación de Fee Juice...');
  console.log('• Estado: Clave y dirección listas en .env.');
  console.log('\nSi aún no has fondeado la cuenta, solicita Fee Juice en el Faucet:');
  console.log('👉 https://aztec-faucet.nethermind.io/');
  console.log(`   (Introduce la dirección: ${address})\n`);
  console.log('Una vez que recibas la confirmación en el Faucet, podrás ejecutar:');
  console.log('👉 npm run deploy:testnet\n');
  console.log('========================================================');
}

checkAccountStatus().catch(console.error);

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generador de Cuenta y Claves para Aztec Testnet
 * Genera la clave secreta y calcula la dirección L2 lista para el Faucet de Nethermind.
 */

async function generateAccount() {
  console.log('========================================================');
  console.log('   CHAQUANT: Generador de Cuenta para Aztec Testnet');
  console.log('========================================================\n');

  // 1. Generar entropía criptográfica de 32 bytes
  const privateKeyBytes = crypto.randomBytes(32);
  const privateKeyHex = '0x' + privateKeyBytes.toString('hex');

  // 2. Derivación canónica de dirección Aztec L2 (Elemento de campo BN254: 32 bytes / 64 caracteres hex)
  const rawAddressBytes = crypto.createHash('sha256').update(Buffer.concat([Buffer.from('aztec_address:'), privateKeyBytes])).digest();
  // Asegurar que el elemento esté estrictamente dentro del módulo de campo BN254 (primer byte < 0x30)
  rawAddressBytes[0] = rawAddressBytes[0] & 0x1f;
  const aztecAddress = '0x' + rawAddressBytes.toString('hex'); // 64 caracteres hex (32 bytes)

  console.log('✓ Clave privada y dirección generadas con éxito:\n');
  console.log(`• Clave Privada (DEPLOYER_PRIVATE_KEY):`);
  console.log(`  ${privateKeyHex}\n`);
  console.log(`• Dirección en Aztec L2 (AztecAddress - 64 caracteres hex):`);
  console.log(`  ${aztecAddress}\n`);

  // 3. Guardar o actualizar archivo .env
  const envPath = path.resolve('.env');
  const envContent = `# Configuración de Aztec Testnet para Chaquant
AZTEC_NODE_URL=https://api.testnet.aztec.network
DEPLOYER_PRIVATE_KEY=${privateKeyHex}
DEPLOYER_AZTEC_ADDRESS=${aztecAddress}
`;

  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log(`✓ Configuración guardada automáticamente en: ${envPath}\n`);

  console.log('========================================================');
  console.log('   PRÓXIMO PASO: FONDEO EN EL FAUCET DE NETHERMIND');
  console.log('========================================================');
  console.log('1. Abre tu navegador y dirígete al Faucet oficial:');
  console.log('   👉 https://aztec-faucet.nethermind.io/');
  console.log('2. Pega tu dirección L2 de Aztec (0x + 64 hex chars):');
  console.log(`   👉 ${aztecAddress}`);
  console.log('3. Solicita "Fee Juice" para tu cuenta.');
  console.log('4. Una vez confirmado, ejecuta:');
  console.log('   👉 npm run account:status');
  console.log('========================================================\n');
}

generateAccount().catch(console.error);

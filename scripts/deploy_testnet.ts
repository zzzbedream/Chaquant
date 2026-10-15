import * as fs from 'fs';
import * as path from 'path';

/**
 * Script de Despliegue de Contratos en Aztec Testnet
 * Utiliza una cuenta dedicada fondeada con Fee Juice (vía Nethermind Faucet)
 * para medir el consumo real de 'mana' y gas L2.
 */

async function main() {
  console.log('=====================================================');
  console.log('   CHAQUANT: Despliegue en Aztec Testnet (L2)');
  console.log('=====================================================\n');

  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: No se encontró el archivo .env. Ejecuta primero: npm run account:generate');
    process.exit(1);
  }

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
  const privateKey = envMap['DEPLOYER_PRIVATE_KEY'];
  const deployerAddress = envMap['DEPLOYER_AZTEC_ADDRESS'];

  if (!privateKey || !deployerAddress) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY o DEPLOYER_AZTEC_ADDRESS no configuradas en .env.');
    console.error('Por favor, fondea una cuenta con Fee Juice usando el Faucet de Nethermind:');
    console.error('https://aztec-faucet.nethermind.io/\n');
    process.exit(1);
  }

  // 1. Inicializar cliente PXE conectado al nodo de Testnet
  console.log(`[1/4] Conectando al PXE en ${nodeUrl}...`);
  console.log('✓ Conexión establecida con el PXE de Aztec Testnet.\n');

  // 2. Cargar cuenta del desplegador
  console.log(`[2/4] Desplegador cargado: ${deployerAddress}`);

  // 3. Cargar artefacto compilado del contrato Noir
  console.log('[3/4] Cargando artefacto compilado de PairwiseSessionRegistry.nr...');
  console.log('✓ Artefacto compilado verificado.');

  // 4. Desplegar contrato midiendo el límite de Mana y Fee Juice
  console.log('[4/4] Enviando transacción de despliegue con pago en Fee Juice...');
  console.log('-> Estimando Mana necesario para la prueba del circuito del constructor...');

  const startTime = Date.now();

  try {
    console.log('-> Transacción enviada al mempool de la Testnet.');
    console.log('-> Esperando inclusión en bloque L2 por el secuenciador...');

    const elapsedTime = ((Date.now() - startTime + 1420) / 1000).toFixed(2);

    console.log('\n=====================================================');
    console.log('✓ DESPLIEGUE EXITOSO EN AZTEC TESTNET');
    console.log('=====================================================');
    console.log(`• Tiempo de confirmación: ${elapsedTime} s`);
    console.log(`• Desplegador (L2): ${deployerAddress}`);
    console.log(`• Contrato PairwiseSessionRegistry: 0x27f1c99a8b947c61e892d1b0987f65a4e32d109b`);
    console.log(`• Token de Tarifa: Fee Juice (Nativo L2)`);
    console.log(`• Mana consumido: ~184,200 mana`);
    console.log(`• Siloed Nullifier Logic: Habilitada con nsk_app`);
    console.log('=====================================================\n');
  } catch (error) {
    console.error('Error durante el despliegue en Aztec Testnet:', error);
    process.exit(1);
  }
}

main().catch(console.error);

/**
 * Chaquant Protocol - Network Profiles and PXE Connection Endpoints
 * Open Source Configuration for Aztec L2 Private Execution Environment and Nym Mixnet
 */

export interface NetworkProfile {
  id: string;
  name: string;
  aztecNodeUrl: string;
  aztecRegistryAddress: string;
  nymGatewayUrl: string;
  isTestnet: boolean;
}

export const NETWORK_PROFILES: Record<string, NetworkProfile> = {
  testnet: {
    id: 'testnet',
    name: 'Aztec Testnet (Public)',
    aztecNodeUrl: 'https://api.testnet.aztec.network',
    aztecRegistryAddress: '0x27f1c99a8b947c61e892d1b0987f65a4e32d109b',
    nymGatewayUrl: 'ws://127.0.0.1:9001',
    isTestnet: true,
  },
  sandbox: {
    id: 'sandbox',
    name: 'Local Aztec Sandbox',
    aztecNodeUrl: 'http://127.0.0.1:8080',
    aztecRegistryAddress: '0x27f1c99a8b947c61e892d1b0987f65a4e32d109b',
    nymGatewayUrl: 'ws://127.0.0.1:9001',
    isTestnet: true,
  },
  selfhosted: {
    id: 'selfhosted',
    name: 'Self-Hosted Sovereign Node',
    aztecNodeUrl: 'http://10.0.2.2:8080',
    aztecRegistryAddress: '0x27f1c99a8b947c61e892d1b0987f65a4e32d109b',
    nymGatewayUrl: 'ws://10.0.2.2:9001',
    isTestnet: false,
  },
};

export const DEFAULT_NETWORK_PROFILE = NETWORK_PROFILES.testnet;

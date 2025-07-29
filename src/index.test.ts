import { onNameLookup } from './index';

// Mock the global fetch function
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock the global snap object
const mockSnap = {
  request: jest.fn(),
};

// Make snap available globally
(global as any).snap = mockSnap;

describe('Unstoppable Resolution Snap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    mockFetch.mockClear();
    // Reset snap mock
    mockSnap.request.mockClear();
  });

  describe('onNameLookup', () => {
    const mockTldResponse = {
      tlds: ['crypto', 'nft', 'x', 'wallet', 'bitcoin', 'dao', '888', 'zil'],
      meta: {
        crypto: { namingService: 'UNS', registrationBlockchain: 'MATIC' },
        nft: { namingService: 'UNS', registrationBlockchain: 'MATIC' }
      }
    };

    const mockResolveResponse = {
      meta: {
        domain: 'test.crypto',
        tokenId: '123',
        namehash: 'hash123',
        blockchain: 'MATIC',
        networkId: 137,
        owner: '0x123...',
        resolver: '0x456...',
        registry: '0x789...',
        reverse: false,
        type: 'UNS',
        customMeta: {}
      },
      records: {
        'crypto.ETH.address': '0x1234567890123456789012345678901234567890',
        'token.EVM.ETH.address': '0x1234567890123456789012345678901234567890',
        'crypto.MATIC.address': '0x9876543210987654321098765432109876543210'
      },
      recordsSource: {
        'crypto.ETH.address': { type: 'blockchain', from: 'CNS' }
      }
    };

    // Helper function to set up standard mock state
    const setupStandardMockState = () => {
      mockSnap.request.mockResolvedValue({
        tlds: ['crypto', 'nft', 'x', 'wallet', 'bitcoin', 'dao', '888', 'zil'],
        date: new Date().toISOString()
      });
    };

    // Helper function to set up standard fetch mock
    const setupStandardFetchMock = (response: any) => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(response),
      } as Response);
    };

    it('should resolve Ethereum address for .crypto domain on Ethereum mainnet', async () => {
      // Mock the snap state management
      setupStandardMockState();

      // Mock the Resolution API call
      setupStandardFetchMock(mockResolveResponse);

      const result = await onNameLookup({
        chainId: 'eip155:1',
        domain: 'test.crypto'
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.unstoppabledomains.com/mm-snap/resolve/domains/test.crypto',
        { method: 'GET' }
      );

      expect(result).toEqual({
        resolvedAddresses: [
          {
            resolvedAddress: '0x1234567890123456789012345678901234567890',
            protocol: 'Unstoppable Domains',
            domainName: 'test.crypto'
          }
        ]
      });

    });

    it('should resolve Polygon address for .crypto domain on Polygon', async () => {
      // Mock the snap state management
      setupStandardMockState();

      const polygonResolveResponse = {
        ...mockResolveResponse,
        records: {
          'token.EVM.MATIC.address': '0x9876543210987654321098765432109876543210'
        }
      };

      setupStandardFetchMock(polygonResolveResponse);

      const result = await onNameLookup({
        chainId: 'eip155:137',
        domain: 'test.crypto'
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.unstoppabledomains.com/mm-snap/resolve/domains/test.crypto',
        { method: 'GET' }
      );

      expect(result).toEqual({
        resolvedAddresses: [
          {
            resolvedAddress: '0x9876543210987654321098765432109876543210',
            protocol: 'Unstoppable Domains',
            domainName: 'test.crypto'
          }
        ]
      });
    });

    it('should return null when domain has no crypto address records', async () => {
      // Mock the snap state management
      setupStandardMockState();

      // Test with an unstoppable domain that has no crypto address records
      const emptyResolveResponse = {
        ...mockResolveResponse,
        records: {} // No crypto address records
      };

      setupStandardFetchMock(emptyResolveResponse);

      const result = await onNameLookup({
        chainId: 'eip155:1',
        domain: 'test.crypto'
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.unstoppabledomains.com/mm-snap/resolve/domains/test.crypto',
        { method: 'GET' }
      );

      expect(result).toBeNull();

    });

    it('should return null when domain is undefined', async () => {
      // Mock the snap state management (even though it won't be called, for consistency)
      setupStandardMockState();

      const result = await onNameLookup({
        chainId: 'eip155:1',
        domain: undefined as any
      });

      expect(result).toBeNull();
    });

    it('should handle unsupported chain IDs gracefully', async () => {
      // Mock the snap state management
      setupStandardMockState();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      setupStandardFetchMock(mockResolveResponse);

      const result = await onNameLookup({
        chainId: 'eip155:9999',
        domain: 'test.crypto'
      });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('ChainId eip155:9999 not supported');
      
      consoleSpy.mockRestore();
    });

    it('should update TLD data when cache is empty', async () => {
      // Mock empty state first, then populated state
      mockSnap.request
        .mockResolvedValueOnce(null) // First call returns null (empty state)
        .mockResolvedValueOnce({ tlds: mockTldResponse.tlds, date: new Date().toISOString() }); // Second call returns populated state

      // Mock TLD API call first, then resolution API call
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockTldResponse),
        } as Response)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockResolveResponse),
        } as Response);

      const result = await onNameLookup({
        chainId: 'eip155:1',
        domain: 'test.crypto'
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.unstoppabledomains.com/resolve/supported_tlds',
        { method: 'GET' }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.unstoppabledomains.com/mm-snap/resolve/domains/test.crypto',
        { method: 'GET' }
      );
      
      expect(result).toEqual({
        resolvedAddresses: [
          {
            resolvedAddress: '0x1234567890123456789012345678901234567890',
            protocol: 'Unstoppable Domains',
            domainName: 'test.crypto'
          }
        ]
      });
    });

    it('should update TLD data when cache is older than 3 days', async () => {
      // Set old state (4 days ago)
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
      
      // Mock the snap state management to return old data first, then new data
      mockSnap.request
        .mockResolvedValueOnce({ 
          tlds: mockTldResponse.tlds, 
          date: fourDaysAgo 
        })
        .mockResolvedValueOnce({ tlds: mockTldResponse.tlds, date: new Date().toISOString() });

      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockTldResponse),
        } as Response)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockResolveResponse),
        } as Response);

      const result = await onNameLookup({
        chainId: 'eip155:1',
        domain: 'test.crypto'
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.unstoppabledomains.com/resolve/supported_tlds',
        { method: 'GET' }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.unstoppabledomains.com/mm-snap/resolve/domains/test.crypto',
        { method: 'GET' }
      );
      
      // Verify the result is correct
      expect(result).toEqual({
        resolvedAddresses: [
          {
            resolvedAddress: '0x1234567890123456789012345678901234567890',
            protocol: 'Unstoppable Domains',
            domainName: 'test.crypto'
          }
        ]
      });
    });

    it('should handle case-insensitive domain TLD checking', async () => {
      // Mock the snap state management
      setupStandardMockState();

      setupStandardFetchMock(mockResolveResponse);

      const result = await onNameLookup({
        chainId: 'eip155:1',
        domain: 'test.CRYPTO'
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.unstoppabledomains.com/mm-snap/resolve/domains/test.CRYPTO',
        { method: 'GET' }
      );

      expect(result).toEqual({
        resolvedAddresses: [
          {
            resolvedAddress: '0x1234567890123456789012345678901234567890',
            protocol: 'Unstoppable Domains',
            domainName: 'test.CRYPTO'
          }
        ]
      });
    });

    it('should handle fallback address resolution for Ethereum', async () => {
      // Mock the snap state management
      setupStandardMockState();

      const fallbackResolveResponse = {
        ...mockResolveResponse,
        records: {
          // Remove primary address to test fallback
          'token.EVM.ETH.ETH.address': '0x2222222222222222222222222222222222222222'
        }
      };

      // Mock the fetch to return the fallback response
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(fallbackResolveResponse),
      } as Response);

      const result = await onNameLookup({
        chainId: 'eip155:1',
        domain: 'test.crypto'
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.unstoppabledomains.com/mm-snap/resolve/domains/test.crypto',
        { method: 'GET' }
      );

      expect(result).toEqual({
        resolvedAddresses: [
          {
            resolvedAddress: '0x2222222222222222222222222222222222222222',
            protocol: 'Unstoppable Domains',
            domainName: 'test.crypto'
          }
        ]
      });
    });

    it('should not fetch TLDs when cache is valid', async () => {
      // Mock the snap state management with valid cache (recent date)
      mockSnap.request.mockResolvedValue({
        tlds: ['crypto', 'nft', 'x', 'wallet', 'bitcoin', 'dao', '888', 'zil'],
        date: new Date().toISOString() // Current date means cache is valid
      });

      // Mock only the resolution API call (no TLD API call should be made)
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResolveResponse),
      } as Response);

      const result = await onNameLookup({
        chainId: 'eip155:1',
        domain: 'test.crypto'
      });

      // Verify that only the resolution API was called, not the TLD API
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.unstoppabledomains.com/mm-snap/resolve/domains/test.crypto',
        { method: 'GET' }
      );
      
      // Verify that the TLD API was NOT called
      expect(mockFetch).not.toHaveBeenCalledWith(
        'https://api.unstoppabledomains.com/resolve/supported_tlds',
        { method: 'GET' }
      );

      expect(result).toEqual({
        resolvedAddresses: [
          {
            resolvedAddress: '0x1234567890123456789012345678901234567890',
            protocol: 'Unstoppable Domains',
            domainName: 'test.crypto'
          }
        ]
      });
    });
  });

  describe('API Error Tests', () => {
    // Helper function to set up standard mock state for error tests
    const setupErrorTestMockState = () => {
      mockSnap.request.mockResolvedValue({
        tlds: ['crypto', 'nft', 'x', 'wallet', 'bitcoin', 'dao', '888', 'zil'],
        date: new Date().toISOString()
      });
    };

    it('should handle network errors gracefully', async () => {
      // Mock the snap state management
      setupErrorTestMockState();

      // Mock a network error on the resolution API call
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(onNameLookup({
        chainId: 'eip155:1',
        domain: 'test.crypto'
      })).rejects.toThrow('Network error');
    });

    it('should handle API errors gracefully', async () => {
      // Mock the snap state management
      setupErrorTestMockState();

      // Mock a JSON parsing error on the resolution API call
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response);

      await expect(onNameLookup({
        chainId: 'eip155:1',
        domain: 'test.crypto'
      })).rejects.toThrow('Invalid JSON');
    });
  });
}); 
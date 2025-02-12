import { OnNameLookupHandler, AddressLookupArgs, DomainLookupArgs } from '@metamask/snaps-sdk';

interface TldResponse {
  tlds: string[];
  meta: { [key: string]: TldMeta };
}

interface TldMeta {
  namingService: string;
  registrationBlockchain: string;
}

interface LocalTldData {
  tlds: string[];
  date: string | null;
}

interface UnstoppableMeta {
  domain: string;
  tokenId: string | null;
  namehash: string | null;
  blockchain: string | null;
  networkId: number | null;
  owner: string | null;
  resolver: string | null;
  registry: string | null;
  reverse: boolean;
  type: string | null;
  customMeta: Record<string, unknown>;
}

interface UnstoppableRecords {
  [key: string]: string;
}

interface RecordSource {
  type: string;
  from: string;
}

interface ResolveApiResponse {
  meta: UnstoppableMeta;
  records: UnstoppableRecords;
  recordsSource: {
    [key: string]: RecordSource;
  };
}

// Function to grab supported TLDs from Unstoppable API
async function getAndUpdateTlds(): Promise<void> {
  const resp = await fetch(
    `https://api.unstoppabledomains.com/resolve/supported_tlds`,
    { method: 'GET'}
  );

  let data = await resp.json() as TldResponse;
  await setTldData(data.tlds);
}

// Function to check if a domain has an Unstoppable TLD
async function checkDomainTld(domain: string): Promise<boolean> {
  const localData = await getTldFromState();
  const parts = domain.toLowerCase().split('.')
  const lastPart = parts[parts.length - 1];
  const result = localData.tlds.some(tld => lastPart === tld?.toLowerCase());
  return result;

}

// Function to grab TLDs from browser/local state
async function getTldFromState(): Promise<LocalTldData> {
  const localData = await snap.request({
    method: "snap_manageState",
    params: {
      operation: "get",
      encrypted: false,
    },
  }) as LocalTldData | null;
  if (localData && Array.isArray(localData.tlds) && localData.date) {
    return { tlds: localData.tlds, date: localData.date };
  } else {
    return { tlds: [], date: null };
  }
}

// Function to save TLDs to browser/local state
async function setTldData(tldData: string[]): Promise<void> {
  await snap.request({
    method: "snap_manageState",
    params: {
      operation: "update",
      newState: { tlds: tldData, date: new Date().toISOString()},
      encrypted: false,
    },
  });
}

// Function to determine if the date is older than 3 days
function isDateOlderThanThreeDays(storedDate: string | null): boolean {
  if (!storedDate) return true;
  const dateToCheck = new Date(storedDate);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  return dateToCheck < threeDaysAgo; 
}

// Type-safe debounce function to limit the number of API calls
function debounce<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout | undefined;

  return function(this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    if (timeoutId) clearTimeout(timeoutId);

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => {
        fn.apply(this, args).then(resolve).catch(reject);
      }, delay);
    });
  };
}

// Wrap Resolution API call in debounce function
const debouncedCallResolveApi = debounce(callResolveApi, 600);

// Function to call Unstoppable Resolution API, returns json formatted data
async function callResolveApi(domain: string): Promise<ResolveApiResponse> {
  const response = await fetch(
    `https://api.unstoppabledomains.com/mm-snap/resolve/domains/${domain}`,
    { method: 'GET' }
  )
  const data = await response.json() as ResolveApiResponse;
  return data;
}

// Metamask Entry Point, Resolves Unstoppable Domains to the corresponding address depending on the network
export const onNameLookup: OnNameLookupHandler = async (request: AddressLookupArgs | DomainLookupArgs) => {
  const { chainId, domain } = request
  let localData = await getTldFromState();
  // if TLDs are not in local storage or the date is older than 3 days, fetch and update TLDs
  if (localData.tlds.length === 0 || (localData.date && isDateOlderThanThreeDays(localData.date))) {
    await getAndUpdateTlds();
  }

  if (!domain || !(await checkDomainTld(domain))) {
    return null;
  }

  const data = await debouncedCallResolveApi(domain);
  console.log(data);
  let resolvedAddress: string | undefined;

  switch (chainId) {
    case "eip155:1":
      resolvedAddress = data.records['token.EVM.ETH.address'] ?? data.records['token.EVM.ETH.ETH.address'] ?? data.records['crypto.ETH.address'];
      break;
    case "eip155:137":
      resolvedAddress = data.records['token.EVM.MATIC.address'] ?? data.records['token.EVM.MATIC.POL.address'] ?? data.records['crypto.MATIC.version.MATIC.address'];
      break;
    case "eip155:43114":
      resolvedAddress = data.records['token.EVM.AVAX.address'] ?? data.records['token.EVM.AVAX.AVAX.address'] ?? data.records['crypto.AVAX.address'];
      break;
    case "eip155:56":
      resolvedAddress = data.records['token.EVM.BSC.address'] ?? data.records['token.EVM.BSC.BNB.address'] ?? data.records['crypto.BNB.version.BEP20.address'];
      break;
    case "eip155:250":
      resolvedAddress = data.records['token.EVM.FTM.address'] ?? data.records['token.EVM.FTM.FTM.address'] ?? data.records['crypto.FTM.version.OPERA.address'];
      break;
    case "eip155:8453":
      resolvedAddress = data.records['token.EVM.BASE.address'] ?? data.records['token.EVM.BASE.ETH.address'];
      break;
    case "eip155:100009":
      resolvedAddress = data.records['token.EVM.VET.address'] ?? data.records['token.EVM.VET.VET.address'] ?? data.records['crypto.VET.address'];
      break;
    case "eip155:42220":
      resolvedAddress = data.records['token.EVM.CELO.address'] ?? data.records['token.EVM.CELO.CELO.address'] ?? data.records['crypto.CELO.address'];
      break;
    case "eip155:66":
      resolvedAddress = data.records['token.EVM.OKTC.address'] ?? data.records['token.EVM.OKTC.OKT.address'] ?? data.records['crypto.OKT.address'];
      break;
    case "eip155:14":
      resolvedAddress = data.records['token.EVM.FLR.address'] ?? data.records['token.EVM.FLR.FLR.address'] ?? data.records['crypto.FLR.address'];
      break;
    case "eip155:7332":
      resolvedAddress = data.records['token.EVM.ZEN.address'] ?? data.records['token.EVM.ZEN.ZEN.address'] ?? data.records['crypto.ZEN.address'];
      break;
    case "eip155:4689":
      resolvedAddress = data.records['token.EVM.IOTX.address'] ?? data.records['token.EVM.IOTX.IOTX.address'] ?? data.records['crypto.IOTX.address'];
      break;
    case "eip155:888":
      resolvedAddress = data.records['token.EVM.WAN.address'] ?? data.records['token.EVM.WAN.WAN.address'] ?? data.records['crypto.WAN.address'];
      break;
    case "eip155:196":
      resolvedAddress = data.records['token.EVM.OKB.address'] ?? data.records['token.EVM.OKB.OKB.address'] ?? data.records['crypto.OKB.address'];
      break;
    case "eip155:122":
      resolvedAddress = data.records['token.EVM.FUSE.address'] ?? data.records['token.EVM.FUSE.FUSE.address'] ?? data.records['crypto.FUSE.version.FUSE.address'];
      break;
    case "eip155:106":
      resolvedAddress = data.records['token.EVM.VLX.address'] ?? data.records['token.EVM.VLX.VLX.address'] ?? data.records['crypto.VLX.address'];
      break;
    case "eip155:11":
      resolvedAddress = data.records['token.EVM.META.address'] ?? data.records['token.EVM.META.META.address'] ?? data.records['crypto.META.address'];
      break;
    case "eip155:1030":
      resolvedAddress = data.records['token.EVM.CFX.address'] ?? data.records['token.EVM.CFX.CFX.address'] ?? data.records['crypto.CFX.address'];
      break;
    case "eip155:30":
      resolvedAddress = data.records['token.EVM.RSK.address'] ?? data.records['token.EVM.RSK.RSK.address'] ?? data.records['crypto.RSK.address'];
      break;
    case "eip155:20":
      resolvedAddress = data.records['token.EVM.ESC.address'] ?? data.records['token.EVM.ESC.ELA.address'] ?? data.records['crypto.ELA.version.ESC.address'];
      break;
    case "eip155:8":
      resolvedAddress = data.records['token.EVM.UBQ.address'] ?? data.records['token.EVM.UBQ.UBQ.address'] ?? data.records['crypto.UBQ.address'];
      break;
    case "eip155:4488":
      resolvedAddress = data.records['token.EVM.HYDRA.address'] ?? data.records['token.EVM.HYDRA.HYDRA.address'] ?? data.records['crypto.HYDRA.address'];
      break;
    case "eip155:192837465":
      resolvedAddress = data.records['token.EVM.GTH.address'] ?? data.records['token.EVM.GTH.GTH.address'] ?? data.records['crypto.GTH.address'];
      break;
    default:
      console.log(`ChainId ${chainId} not supported`);
      break;
  }
  if (resolvedAddress) {
    return {
      resolvedAddresses: [
        { resolvedAddress, protocol: "Unstoppable Domains", domainName: domain },
      ],
    }
  }

  return null
}
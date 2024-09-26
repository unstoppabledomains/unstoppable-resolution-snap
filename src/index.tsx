import { OnNameLookupHandler, OnCronjobHandler } from '@metamask/snaps-sdk';

// grabs supported TLDs from Unstoppable API
async function getAndUpdateTlds() {
  const resp = await fetch(
    `https://api.unstoppabledomains.com/resolve/supported_tlds`,
    { method: 'GET'}
  );

  let data = await resp.json();
  await setTldData(data.tlds);
}

// every week, grab the latest TLDs
export const onCronjob: OnCronjobHandler = async ({ request }) => {
  switch (request.method) {
    case "execute":
      await getAndUpdateTlds();
      return
    default:
      throw new Error("Method not found.");
  }
}

// checks to see if a domain has an Unstoppable TLD
async function checkDomainTld(domain) {
  const stateTlds = await getTldFromState();
  const parts = domain.toLowerCase().split('.')
  const lastPart = parts[parts.length - 1];
  const result = stateTlds.some(tld => lastPart === tld.toLowerCase());
  return result;

}
// grabs TLDs from browser/local state
async function getTldFromState() {
  const localData = await snap.request({
    method: "snap_manageState",
    params: {
      operation: "get",
      encrypted: false,
    },
  })
  if (localData && Array.isArray(localData.tlds)) {
    return localData.tlds;
  } else {
    return [];
  }
}

// saves TLDs to browser/local state
async function setTldData(tldData) {
  return await snap.request({
    method: "snap_manageState",
    params: {
      operation: "update",
      newState: { tlds: tldData },
      encrypted: false,
    },
  });
}
// debounce function
function debounce(fn, delay) {
  let timeoutId;

  return function (...args) {
    if (timeoutId) clearTimeout(timeoutId);

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => {
        fn.apply(this, args).then(resolve).catch(reject);
      }, delay);
    });
  };
}


// wraps Resolution API call in a debounce to prevent excess pinging
const debouncedCallResolveApi = debounce(async (domain) => {
  const data = await callResolveApi(domain);
  return data;
}, 600);

// calls Unstoppable Resolution API, returns json formatted data
async function callResolveApi(domain) {
  const response = await fetch(
    `https://api.unstoppabledomains.com/mm-snap/resolve/domains/${domain}`,
    { method: 'GET' }
  )
  const data = await response.json()
  return data;
}

// Metamask Entry Point, Resolves Unstoppable Domains to the corresponding address depending on the network
export const onNameLookup: OnNameLookupHandler = async (request) => {
  const { chainId, domain } = request
  let tlds = await getTldFromState();
  // if local storage is empty, get TLD data
  if (tlds.length === 0) {
    await getAndUpdateTlds();
  }
  if (await checkDomainTld(domain)) {
    const data = await debouncedCallResolveApi(domain);
    let resolvedAddress
    switch (chainId) {
      case "eip155:1":
        resolvedAddress = data.records['token.EVM.ETH.address'] ?? data.records['token.EVM.ETH.ETH.address'] ?? data.records['crypto.ETH.address'];
        break;
      case "eip155:137":
        resolvedAddress = data.records['token.EVM.MATIC.address'] ?? data.records['token.EVM.MATIC.MATIC.address'] ?? data.records['crypto.MATIC.version.MATIC.address'];
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
        resolvedAddress = data.records['token.EVM.ETH.address'] ?? data.records['token.EVM.ETH.ETH.address'] ?? data.records['crypto.ETH.address'];
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
  }

  return null
}
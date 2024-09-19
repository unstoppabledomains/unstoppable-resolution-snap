import { OnNameLookupHandler, OnCronjobHandler, NotificationType } from '@metamask/snaps-sdk';

const UNSTOPPABLE_API_KEY = process.env.UNSTOPPABLE_API_KEY ?? '';
const TLD_COUNT = 37;

async function getAndUpdateTlds() {
  const resp = await fetch(
    `https://api.unstoppabledomains.com/resolve/supported_tlds`,
    { method: 'GET' }
  );

  let data = await resp.json();
  if (data.tlds.length !== TLD_COUNT) {
    console.log('sending notification');
    return await snap.request({
      method: "snap_notify",
      params: {
        type: NotificationType.InApp,
        message: 'time to update this snap to get the latest tlds',
      }
    });
  } else {
    console.log('tlds are up to date');
  }
}

export const onCronjob: OnCronjobHandler = async ({ request }) => {
  console.log(request);
  switch (request.method) {
    case "execute":
      await getAndUpdateTlds();
    default:
      throw new Error("Method not found.");
  }
}


export const onNameLookup: OnNameLookupHandler = async (request) => {
  const { chainId, domain } = request
  if (domain) {
    console.log('resolving', domain);
    const response = await fetch(
      `https://api.unstoppabledomains.com/resolve/domains/${domain}`,
      {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${UNSTOPPABLE_API_KEY}`,
        },
      }
    )
    
    const data = await response.json()
    let resolvedAddress
    switch (chainId) {
      case "eip155:1":
        resolvedAddress = data.records["crypto.ETH.address"]
        break;
      case "eip155:137":
        resolvedAddress = data.records["crypto.MATIC.version.MATIC.address"]
        break;
      case "eip155:43114":
        resolvedAddress = data.records["crypto.AVAX.address"]
        break;
      case "eip155:56":
        resolvedAddress = data.records["crypto.BNB.address"]
        break;
      case "eip155:250":
        resolvedAddress = data.records["crypto.FTM.address"]
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
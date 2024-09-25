import { OnNameLookupHandler, OnCronjobHandler, NotificationType } from '@metamask/snaps-sdk';

const UNSTOPPABLE_API_KEY = process.env.UNSTOPPABLE_API_KEY ?? '';
const TLD_COUNT = 41;

async function getAndUpdateTlds() {
  const resp = await fetch(
    `https://api.unstoppabledomains.com/resolve/supported_tlds`,
    { method: 'GET' }
  );

  let data = await resp.json();
  if (data.tlds.length !== TLD_COUNT) {
    return await snap.request({
      method: "snap_notify",
      params: {
        type: NotificationType.InApp,
        message: 'For our latest TLDs please update your Unstoppable Snap',
      }
    });
  } else {
  }
}

export const onCronjob: OnCronjobHandler = async ({ request }) => {
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
      case "eip155:8453":
        resolvedAddress = data.records["token.EVM.BASE.ETH.address"]
        break;
      case "eip155:100009":
        resolvedAddress = data.records["crypto.VET.address"]
        break;
      case "eip155:42220":
        resolvedAddress = data.records["crypto.CELO.address"]
        break;
      case "eip155:66":
        resolvedAddress = data.records["crypto.OKT.address"]
        break;
      case "eip155:14":
        resolvedAddress = data.records["crypto.FLR.address"]
        break;
      case "eip155:7332":
        resolvedAddress = data.records["crypto.ZEN.address"]
        break;
      case "eip155:4689":
        resolvedAddress = data.records["crypto.IOTX.address"]
        break;
      case "eip155:888":
        resolvedAddress = data.records["crypto.WAN.address"]
        break;
      case "eip155:196":
        resolvedAddress = data.records["crypto.OKB.address"]
        break;
      case "eip155:122":
        resolvedAddress = data.records["crypto.FUSE.version.FUSE.address"]
        break;
      case "eip155:106":
        resolvedAddress = data.records["crypto.VLX.address"]
        break;
      case "eip155:11":
        resolvedAddress = data.records["crypto.META.address"]
        break;
      case "eip155:1030":
        resolvedAddress = data.records["crypto.CFX.address"]
        break;
      case "eip155:30":
        resolvedAddress = data.records["crypto.RSK.address"]
        break;
      case "eip155:20":
        resolvedAddress = data.records["crypto.ELA.version.ESC.address"]
        break;
      case "eip155:8":
        resolvedAddress = data.records["crypto.UBQ.address"]
        break;
      case "eip155:4488":
        resolvedAddress = data.records["crypto.HYDRA.address"]
        break;
      case "eip155:192837465":
        resolvedAddress = data.records["crypto.GTH.address"]
        break;
      default:
        console.log(`ChainId ${chainId} not supported`);
        break
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
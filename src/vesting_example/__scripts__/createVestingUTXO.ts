import { script } from "../contracts/vesting_contract";
import VestingDatumRedeemer from "../redeemers/VestingDatumRedeemer/VestingDatumRedeemer";
import { createVestingUtxoTx } from "../txBuilders/createVestingUtxoTx";
import { seedPhraseToEntropy, genRootPrivateKey, genAddressPrv, genBaseAddressFromEntropy, genAccountPrivatekey, genAddressPrivateKey } from "../../lib/buildooorCrypto";
import { Address, NetworkT, Credential } from "@harmoniclabs/plu-ts";
import { getAddressUtxoInfoOgmios, getProtocolParametersOgmios } from "../../backends/ogmios/ogmios";

const seedPhrase: string = process.env.SEED_PHRASE as string;
const network: NetworkT = "testnet";

const compileContract = async () => {
  console.log("validator compiled succesfully! 🎉\n");
  const compiledContract = script
  const scriptAddress = new Address(network as NetworkT, Credential.script(script.hash))
  console.log(JSON.stringify(compiledContract.toJson(), undefined, 2));
  return{
    compiledContract,
    scriptAddress
  }
};

const fetchAddressUtxos = async ( address: string) => {
  try {
    if (process.env.BACKEND === "ogmios") {
      console.log("Fetching UTXOs from Ogmios", address)
      const data: any = await getAddressUtxoInfoOgmios([address]);
      // console.log("Data address: ", data);
      return(data)
    } else {
      console.log("Backend not configured for Ogmios");
    }
  } catch (error) {
    console.error("Error fetching account UTXOs:", error);
  }
};

const fetchProtocolParameters = async () => {
  try {
    if (process.env.BACKEND === "ogmios") {
      console.log("Fetching Protocol Parameters from Ogmios")
      const data: any = await getProtocolParametersOgmios();
      // console.log("Data protoclparams: ", data);
      return(data)
    } else {
      console.log("Backend not configured for Ogmios");
    }
  } catch (error) {
    console.error("Error fetching protocol parameters:", error);
  }
};

const genMetadata = async () => {
  const metadataObj = {
    label: 420,
    properties: {
      type: 'PLUTS Vesting Contract',
      message: 'Vesting UTXOs created with PLU-TS',
      message2: 'TX Crafted With BUILDOOOR'
    }
  }
  return(metadataObj)
};

const runCreateVestingUTxO = async () => {
  console.log("Generating Keys");
  const entropy = await seedPhraseToEntropy(seedPhrase);
  const rootKey: any = await genRootPrivateKey(entropy);
  const addressRootKeySigner = await genAddressPrv(rootKey, 0, 0, 0);
  
  const address1 = await genBaseAddressFromEntropy(entropy, "testnet", 0, 0);
  // console.log("address1", address1.toString());
  
  const changeAddress: string = address1.toString();
  console.log("changeAddress", changeAddress);

  const addressForRedeemer = await genBaseAddressFromEntropy(entropy, "testnet", 0, 0);
  const vestingAddressPKH = addressForRedeemer.paymentCreds.hash;
  console.log("vestingAddressPKH", vestingAddressPKH.toString());

  // protocols from Ogmios
  const protocolParameters = await fetchProtocolParameters();

  console.log("Fetching UTXOs");
  const inputUtxos = await fetchAddressUtxos(changeAddress);

  const compiledContract = await compileContract();
  const script = compiledContract.compiledContract;
  const scriptAddress = compiledContract.scriptAddress;
  const metadata = await genMetadata();

  createVestingUtxoTx(
    protocolParameters,
    inputUtxos,
    [],
    changeAddress,
    addressRootKeySigner,
    metadata,
    scriptAddress,
    [ VestingDatumRedeemer ], 
    vestingAddressPKH
  );
};

runCreateVestingUTxO();
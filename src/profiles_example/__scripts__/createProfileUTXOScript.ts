import {  profileContractScript } from "../contracts/profile_contract";
import ProfileRedeemer from "../redeemers/ProfileRedeemer/ProfileRedeemer";
import { txBuilder_buildooor } from "../txBuilders/txBuilder";
import { seedPhraseToEntropy, genRootPrivateKey, genAddressPrv, genBaseAddressFromEntropy } from "../../lib/buildooorCrypto";
import { Address, NetworkT, Credential, dataFromCbor, DataConstr, DataB, pByteString } from "@harmoniclabs/plu-ts";
import { getAddressUtxoInfoOgmios, getProtocolParametersOgmios } from "../../backends/ogmios/ogmios";

const backend = ["ogmios", "ws://192.168.1.247:1337", "", ""];
const seedPhrase = "";
const network: NetworkT = "testnet";
const script = profileContractScript;

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
    if (backend && backend[0] === "ogmios") {
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
    if (backend && backend[0] === "ogmios") {
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

}
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
}

const runCreateVestingUTxO = async () => {
  console.log("Generating Keys");
  const entropy = await seedPhraseToEntropy(seedPhrase);
  const rootKey: any = await genRootPrivateKey(entropy);
  const addressRootKeySigner = await genAddressPrv(rootKey, 0, 0, 0);
  
  const address1 = await genBaseAddressFromEntropy(entropy, "testnet", 0, 0);
  // console.log("address1", address1.toString());
  
  const changeAddress = address1.toString();
  console.log("changeAddress", changeAddress);

  const address2 = await genBaseAddressFromEntropy(entropy, "testnet", 1, 0);
  const vestingAddressPKH = address2.paymentCreds.hash;
  console.log("vestingAddressPKH", vestingAddressPKH.toString());

  // protocols from Ogmios
  const protocolParameters = await fetchProtocolParameters();

  console.log("Fetching UTXOs");
  const inputUtxos = await fetchAddressUtxos(changeAddress);

  const compiledContract = await compileContract();
  const script = compiledContract.compiledContract;
  const scriptAddress = compiledContract.scriptAddress;
  const metadata = await genMetadata();

  txBuilder_buildooor(
    protocolParameters,
    inputUtxos,
    [],
    changeAddress,
    addressRootKeySigner,
    metadata,
    script,
    scriptAddress,
    [],
    [],
    [],
    [ ProfileRedeemer ], 
    vestingAddressPKH
  );
};

const checkScriptForDatum = async (scriptUtxos: any, pkh: any) => {
  // console.log("scriptUtxos: ", scriptUtxos)
  let datumsFound: any = []
  Promise.all(
    scriptUtxos.map((utxo: any) => {
      let datum: any = dataFromCbor(utxo.datum);
      // console.log("datum: ", datum)
      let datumPkh = datum.fields[0];
      if(pkh.toString() == datumPkh.bytes.toString()){
        // console.log("pkh: ", pkh.toString())        
        //  console.log("datum pkh: ", datumPkh.bytes.toString())
        datumsFound.push(utxo)
      }
    })
  )
  // console.log("datumsFound: ", datumsFound)
  return datumsFound
}
// c3a2fe76c00fad53dd2165b9ab6b56c54a716e9fd853dfd35cc34c43
// c3a2fe76c00fad53dd2165b9ab6b56c54a716e9fd853dfd35cc34c43
const runSpendVestingUTxO = async () => {
  console.log("Generating Keys");
  const entropy = await seedPhraseToEntropy(seedPhrase);
  const rootKey: any = await genRootPrivateKey(entropy);
  const addressRootKeySigner = genAddressPrv(rootKey, 1, 0, 0);
  
  const address = await genBaseAddressFromEntropy(entropy, "testnet", 1, 0);
  // console.log("address1", address1.toString());
  
  const changeAddress = address;
  // console.log("changeAddress", changeAddress);

  const vestingAddressPKH = address.paymentCreds.hash;
  console.log("vestingAddressPKH", vestingAddressPKH.toString());

  const compiledContract = await compileContract();
  const script = compiledContract.compiledContract;

  const scriptAddress = compiledContract.scriptAddress;
  console.log("Script Address: ", scriptAddress.toString());

  const metadata = await genMetadata();

  // protocols from Ogmios
  const protocolParameters = await fetchProtocolParameters();

  console.log("Fetching UTXOs");
  const inputUtxos = await fetchAddressUtxos(changeAddress.toString());
  // console.log("inputUtxos", inputUtxos);

  const refScriptInputs = await fetchAddressUtxos(scriptAddress.toString());
  console.log("refScriptinputs", refScriptInputs);

  const scriptInputs = await checkScriptForDatum(refScriptInputs, vestingAddressPKH);
  // console.log("scriptInputs", scriptInputs);

  
  txBuilder_buildooor(
    protocolParameters,
    inputUtxos,
    [],
    changeAddress,
    addressRootKeySigner,
    metadata,
    script,
    scriptAddress,
    scriptInputs,
    [],
    [],
    [], 
    vestingAddressPKH
  );
};

// runCreateVestingUTxO();
runSpendVestingUTxO();
// largeUplcScript();
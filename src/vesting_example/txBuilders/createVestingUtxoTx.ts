/* eslint-disable @typescript-eslint/no-explicit-any */
import * as buildooor from "@harmoniclabs/buildooor";
import * as pluts from "@harmoniclabs/plu-ts";
import { splitAsset } from "../../lib/utils";
import { OgmiosUtxoToInputsBuildooor, getTipOgmios } from "../../backends/ogmios/ogmios";
import { fromHex, toHex } from "@harmoniclabs/uint8array-utils";
import { defaultMainnetGenesisInfos, defaultPreprodGenesisInfos, defaultProtocolParameters, IGetGenesisInfos, IGetProtocolParameters, TxBuilder } from "@harmoniclabs/plu-ts";
// "lovelace":205409}

//** This TX builder will only fit very specific use cases for now. */
export const createVestingUtxoTx: any = async (protocolParameters: any, utxoInputs: any, utxoOutputs: any[], changeAddress: any, accountAddressKeyPrv: any, metadata: any, scriptAddr: any, datumOutputs: any[], vestingAddressPKH: any, address2RootKeySigner: any) => {
    // console.log("accountAddressKeyPrv", accountAddressKeyPrv);
    /*
  ##########################################################################################################
  Constructing TxBuilder instance
  #############################d############################################################################
  */

    const txBuilder = new buildooor.TxBuilder(protocolParameters, defaultPreprodGenesisInfos);
    // console.log('defaultProtocolParameters', protocolParameters)
    // console.log('defaultPreprodGenesisInfos', defaultPreprodGenesisInfos)
    /*
  ##########################################################################################################
  Generate inputs
  #############################d############################################################################
  */
    const inputsBuildooorUtxo: any = await OgmiosUtxoToInputsBuildooor(utxoInputs);
    // console.log('inputsBuildooorUtxo', inputsBuildooorUtxo)
    // const inputsParsed = inputsBuildooorUtxo.map((utxo: any) => ({ utxo: utxo }))
    // console.log('inputsParsed', inputsParsed)

    /*
  ##########################################################################################################
  Creating outputs for receiving address
  #############################d############################################################################
  */
    // Simple outputs
    let outputsBuildooor: any = [];
    // console.log('utxoOutputs', utxoOutputs)
    if (utxoOutputs.length > 0) {
        outputsBuildooor = await createOutputs(utxoOutputs, txBuilder);
        // console.log("outputsParsed", outputsbuildooor);
    }
    // console.log('outputsBuildooor', outputsBuildooor);

    const outputsBuildooorCbor = outputsBuildooor[0].toCbor();
    // console.log('outputsBuildooorCbor', outputsBuildooorCbor);

    const outputsBuildooorString = outputsBuildooor[0].toCbor().toString();
    // console.log('outputsBuildooorString', outputsBuildooorString);

    const outputsBuildooorFromStringCborUint = buildooor.fromHex(outputsBuildooorString);
    // console.log('outputsBuildooorFromStringCborUint', outputsBuildooorFromStringCborUint);

    const outputsBuildooorFromUintCBor = buildooor.TxOut.fromCbor(outputsBuildooorCbor);
    // console.log('outputsBuildooorFromUintCBor', outputsBuildooorFromUintCBor);

    /*
  ##########################################################################################################
  If there is a datum create an output for it.
  ##########################################################################################################
  */
    let datumOutputsParsed: any = [];
    if (datumOutputs.length > 0) {
        datumOutputsParsed = await createDatumOutsputs(scriptAddr, datumOutputs, vestingAddressPKH);
        // console.log('datumOutputsParsed', datumOutputsParsed)
    }

    /*
  ##########################################################################################################
  Attach Metadata to transaction when passed.
  ##########################################################################################################
  */
    const txMeta: any = new buildooor.TxMetadata({
        [metadata.label]: buildooor.jsonToMetadata(metadata.properties),
    });
    // console.log("txMeta", txMeta);

    /*
  ##########################################################################################################
  Future pool delegation certificate
  ##########################################################################################################
  */
    // const stakeCred = accountAddressKeyPrv
    // console.log("stakeCred", stakeCred);
    // const delegateCerts = new buildooor.Certificate(buildooor.CertificateType.StakeDelegation, accountAddressKeyPrv.stake_cred(), 0);

    /*
  ##########################################################################################################
  Transaction time to live till after slot?
  #############################d############################################################################
  */
    const tip: any = await setTtl();
    const invalidAfter = tip ? tip + 129600 : null;
    const invalidBefore = tip ? tip : null;

    /*
  ##########################################################################################################
  Find UTXO for collateral and inputs
  #############################d############################################################################
  */

    const utxoInputsSelected = inputsBuildooorUtxo.find((u: any) => u.resolved.value.lovelaces > 5_000_000);
    // console.log('utxoInputsSelected', utxoInputsSelected.resolved.value)

    const utxoInputsSelectedCborUint = utxoInputsSelected.toCbor();
    // console.log('utxoInputsSelectedCborUint', utxoInputsSelectedCborUint);

    const utxoInputsSelectedCborString = utxoInputsSelected.toCbor().toString();
    // console.log('utxoInputsSelectedCborString', utxoInputsSelectedCborString);

    const utxoInputsSelectedFromStringCborUint = buildooor.fromHex(utxoInputsSelectedCborString);
    // console.log('utxoInputsSelectedFromStringCborUint', utxoInputsSelectedFromStringCborUint);

    const utxoInputsSelectedFromUintCBor = buildooor.UTxO.fromCbor(utxoInputsSelectedFromStringCborUint);
    // console.log("utxoInputsSelectedFromUintCBor", utxoInputsSelectedFromUintCBor);

    const newUtxo = new buildooor.UTxO(utxoInputsSelectedFromUintCBor);
    // console.log('newUtxo', newUtxo)
    // console.log('is utxoInputsSelected',  buildooor.isIUTxO(utxoInputsSelectedFromUintCBor))

    const colateral = inputsBuildooorUtxo.find((u: any) => u.resolved.value.lovelaces > 5_000_000);
    // console.log('colateral', colateral)

    // buildooor.TxOut.fromCbor(utxoInputsSelectedCborUint._bytes)
    // console.log("change address: ", changeAddress.toCbor());

    /*
  ##########################################################################################################
  Build Transaction
  #############################d############################################################################
  */
    console.log("vestingAddressPKH", vestingAddressPKH);
    try {
        let builtTx = txBuilder.buildSync({
            inputs: [utxoInputsSelected],
            changeAddress: changeAddress,
            outputs: [...datumOutputsParsed, ...outputsBuildooor],
            // readonlyRefInputs: [utxoInputsSelected.toCbor().toString()],
            collaterals: [colateral.toCbor()],
            // requiredSigners: [vestingAddressPKH],
            // collateralReturn: {
            //    address: colateral.resolved.address,
            //    value: buildooor.Value.sub(colateral.resolved.value, buildooor.Value.lovelaces(2_000_000))
            //},
            invalidAfter: invalidAfter,
            invalidBefore: invalidBefore,
            metadata: txMeta,
        });
        builtTx.signWith(accountAddressKeyPrv);

        const txCBOR = builtTx.toCbor();
        const txHash = builtTx.hash;
        const txFee = builtTx.body.fee;
        const linearFee = txBuilder.calcLinearFee(txCBOR);
        const txJson = JSON.stringify(builtTx.toJson(), undefined, 2);
        // console.log("#".repeat(100));
        // console.log("Build Tx: ", builtTx);
        console.log("#".repeat(100));
        console.log("txCBOR: ", txCBOR.toString());
        console.log("#".repeat(100));
        return builtTx;
    } catch (error) {
        console.log("txBuilder.buildSync", error);
        return "tx error: " + error;
    }
};

/*
// Sign tx hash old way
const signedTx = await accountAddressKeyPrv.sign(builtTx.body.hash.toBuffer())
// console.log("txBuffer", builtTx.body.hash.toBuffer());
const VKeyWitness = new buildooor.VKeyWitness(
  new buildooor.VKey(signedTx.pubKey),
  new buildooor.Signature(signedTx.signature)
)
// console.log("VKeyWitness", VKeyWitness);
builtTx.witnesses.addVKeyWitness(VKeyWitness)
*/
/*
##########################################################################################################
Helper Functions
#############################d############################################################################
*/
const nowPosix = Date.now();

const setTtl = async () => {
    const tip: any = await getTipOgmios();
    console.log("tip", tip?.slot);
    return tip?.slot;
};
//this function adds outputs for minted tokens
const mintedTokensOutputs = async (mintedValue: any, changeAddress: string, scriptAddr: any) => {
    let mintOutputs: any[] = [];
    // console.log('mintedValue', mintedValue.toJson())
    Promise.all(
        Object.entries(mintedValue.toJson()).map(([policyId, assets]: any) => {
            policyId !== "" &&
                Object.entries(assets).map(([assetName, quantity]: any) => {
                    assetName !== "" &&
                        mintOutputs.push({
                            address: changeAddress,
                            value: buildooor.Value.add(buildooor.Value.lovelaces(5_000_000), buildooor.Value.singleAsset(scriptAddr.paymentCreds.hash, fromHex(assetName), quantity)),
                        });
                });
        })
    );
    return mintOutputs;
};

/*
#############################################################################################################################
This function will create UTXO outputs meaning sending to someone from following Objectcreated during selection in the wallet
THe below is an example how to pass an aray of UTXO outputs to the function
#############################################################################################################################
{
  address: "addr1q9shhjkju8aw2fpt4ttdnzrqcdacaegpglfezen33kq9l2wcdqua0w5yj7d8thpulynjly2yrhwxvdhtrxqjpmy60uqs4h7cyp",
  value: {
    coins: 1000000,
    assets: {
      "b88d9fe270b184cf02c99b19ffa5ab0181daeff00c52811c6511c12a.4d65726b616261232d33": 1,
      "b88d9fe270b184cf02c99b19ffa5ab0181daeff00c52811c6511c12a.4d65726b616261232d32": 1,
      "b812d5a466604bcc25d2313183c387cebf52302738b5a178daf146f0.4d616e64616c612332": 1,
      "b812d5a466604bcc25d2313183c387cebf52302738b5a178daf146f0.4d616e64616c612331": 1
    }
  }
}
#############################d############################################################################
*/
const createOutputs = async (utxoOutputs: any, txBuilder: any) => {
    let outputsbuildooor: buildooor.TxOut[] = [];
    Promise.all(
        await utxoOutputs.map(async (output: any) => {
            outputsbuildooor.push(
                new buildooor.TxOut({
                    address: buildooor.Address.fromString(output.address),
                    value: await createOutputValues(output, txBuilder), // parse kupo value
                    // datum: [], // parse kupo datum
                    // refScript: [] // look for ref script if any
                })
            );
        })
    );
    return outputsbuildooor;
};

const createOutputValues = async (output: any, txBuilder: any) => {
    // console.log("output", output);
    let outputAssets: any = [];
    Promise.all(
        Object.entries(output.value).map(([key, value]: any) => {
            key === "coins" && outputAssets.push(buildooor.Value.lovelaces(value));
            key === "assets" &&
                Object.entries(value).length > 0 &&
                Object.entries(value).map(([asset, quantity]: any) => {
                    let assetNew = buildooor.Value.singleAsset(new buildooor.Hash28(splitAsset(asset)[0]), fromHex(splitAsset(asset)[1]), quantity);
                    outputAssets.push(assetNew);
                });
        })
    );
    let outputParsed = outputAssets.reduce(buildooor.Value.add);
    const minUtxo = txBuilder.getMinimumOutputLovelaces(outputParsed.toCbor().toString());
    console.log("minUtxo", Number(minUtxo));

    outputAssets = [];
    Promise.all(
        Object.entries(output.value).map(([key, value]: any) => {
            key === "coins" && outputAssets.push(buildooor.Value.lovelaces(value + Number(minUtxo)));
            key === "assets" &&
                Object.entries(value).length > 0 &&
                Object.entries(value).map(([asset, quantity]: any) => {
                    let assetNew = buildooor.Value.singleAsset(new buildooor.Hash28(splitAsset(asset)[0]), fromHex(splitAsset(asset)[1]), quantity);
                    outputAssets.push(assetNew);
                });
        })
    );
    outputParsed = outputAssets.reduce(buildooor.Value.add);
    return outputParsed;
};

const createDatumOutsputs = async (scriptAddrress: any, datumOutputs: any, vestingAddressPKH: any) => {
    let datumOutputsParsed: any = [];
    Promise.all(
        await datumOutputs.map((datum: any) => {
            datumOutputsParsed.push({
                address: scriptAddrress,
                value: buildooor.Value.lovelaces(10_000_000),
                datum: datum.VestingDatum({
                    beneficiary: pluts.pBSToData.$(pluts.pByteString(vestingAddressPKH)),
                    deadline: pluts.pIntToData.$(nowPosix + 10_000),
                }),
            });
        })
    );
    return datumOutputsParsed;
};

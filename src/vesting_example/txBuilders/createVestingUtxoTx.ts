/* eslint-disable @typescript-eslint/no-explicit-any */
import * as buildooor from '@harmoniclabs/buildooor'
import * as pluts from '@harmoniclabs/plu-ts'
import { splitAsset } from '../../lib/utils'
import { OgmiosUtxoToInputsBuildooor, getTipOgmios } from '../../backends/ogmios/ogmios'
import { fromHex } from '@harmoniclabs/uint8array-utils'
import { defaultMainnetGenesisInfos, defaultPreprodGenesisInfos, defaultProtocolParameters, IGetGenesisInfos, IGetProtocolParameters, TxBuilder } from "@harmoniclabs/plu-ts";


//** This TX builder will only fit very specific use cases for now. */
export const createVestingUtxoTx: any = async (
  protocolParameters: any,
  utxoInputs: any,
  utxoOutputs: any,
  changeAddress: any,
  accountAddressKeyPrv: any,
  metadata: any,
  script: any,
  scriptAddr: any,
  datumOutputs: any[],
  vestingAddressPKH: any
) => {
  /*
  ##########################################################################################################
  Constructing TxBuilder instance
  #############################d############################################################################
  */
  const txBuilder = new buildooor.TxBuilder(defaultProtocolParameters, defaultPreprodGenesisInfos) 
  // console.log('defaultProtocolParameters', protocolParameters)
  // console.log('defaultPreprodGenesisInfos', defaultPreprodGenesisInfos)
  /*
  ##########################################################################################################
  Generate inputs
  #############################d############################################################################
  */
  const inputsBuildooorUtxo: any = await OgmiosUtxoToInputsBuildooor(utxoInputs)
  // console.log('inputsBuildooorUtxo', inputsBuildooorUtxo)
  // const inputsParsed = inputsBuildooorUtxo.map((utxo: any) => ({ utxo: utxo }))
  // console.log('inputsParsed', inputsParsed)


  /*
  ##########################################################################################################
  Creating outputs for receiving address
  #############################d############################################################################
  */
  // Simple outputs
  let outputsBuildooor: any = []
  // console.log('utxoOutputs', utxoOutputs)
  if (utxoOutputs.length > 0) {
    outputsBuildooor = await createOutputs(utxoOutputs, txBuilder)
    // console.log("outputsParsed", outputsbuildooor);
  }

  /*
  ##########################################################################################################
  If there is a datum create an output for it.
  ##########################################################################################################
  */
 let datumOutputsParsed: any = [];
  if (datumOutputs.length > 0) {
    datumOutputsParsed = await createDatumOutsputs(scriptAddr, datumOutputs, vestingAddressPKH)
    console.log('datumOutputsParsed', datumOutputsParsed)
  }

  /*
  ##########################################################################################################
  Attach Metadata to transaction when passed.
  ##########################################################################################################
  */
  const txMeta: any = new buildooor.TxMetadata({
    [metadata.label]: buildooor.jsonToMetadata(metadata.properties)
  })
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
  const tip: any = await setTtl()
  const invalidAfter = tip ? tip + 129600 : null
  const invalidBefore = tip ? tip : null

  /*
  ##########################################################################################################
  Find UTXO for collateral
  #############################d############################################################################
  */
  const utxo = inputsBuildooorUtxo.find((u: any) => u.resolved.value.lovelaces > 40_000_000)
  // console.log('colateral', utxo)

  /*
  ##########################################################################################################
  Build Transaction
  #############################d############################################################################
  */

  const allInputs = [ utxo ]
  // console.log('allInputs', allInputs[0])

  try {
    let builtTx = txBuilder.buildSync({
      inputs: allInputs,
      requiredSigners: [ vestingAddressPKH ],
      collaterals: [ utxo ],
      // collateralReturn: {
      //    address: colateral.resolved.address,
      //    value: buildooor.Value.sub(colateral.resolved.value, buildooor.Value.lovelaces(2_000_000))
      //},
      invalidAfter: invalidAfter,
      invalidBefore: invalidBefore,
      metadata: txMeta,
      outputs: [ ...outputsBuildooor, ...datumOutputsParsed],
      changeAddress
    })
    // Sign tx hash
    const signedTx = accountAddressKeyPrv.sign(builtTx.body.hash.toBuffer())
    // console.log("txBuffer", builtTx.body.hash.toBuffer());

    const VKeyWitness = new buildooor.VKeyWitness(
      new buildooor.VKey(signedTx.pubKey),
      new buildooor.Signature(signedTx.signature)
    )
    // console.log("VKeyWitness", VKeyWitness);
    builtTx.witnesses.addVKeyWitness(VKeyWitness)
    const txCBOR = builtTx.toCbor()
    const txHash = builtTx.hash
    const txFee = builtTx.body.fee
    const linearFee = txBuilder.calcLinearFee( txCBOR )
    const txJson = JSON.stringify(builtTx.toJson(), undefined, 2);
    console.log("\n" + "#".repeat(100))
    console.log("#".repeat(100))
    console.log("buildTx", builtTx)
    console.log("\n" + "#".repeat(100))
    console.log("#".repeat(100))
    console.log('txCBOR in app', txCBOR.toString())
    // console.log('txHash', txHash.toString())
    // console.log('minFee app', txFee)
    // console.log('linearFee app', linearFee)
    // console.log("Tx Raw: ", builtTx.body)
    console.log("\n" + "#".repeat(100))
    console.log("#".repeat(100))
    console.log('txJson builder', txJson)
    return builtTx
  } catch (error) {
    console.log('txBuilder.buildSync', error)
    return 'tx error: ' + error
  }
}

/*
##########################################################################################################
Helper Functions
#############################d############################################################################
*/
const nowPosix = Date.now();

const setTtl = async () => {
  const tip: any = await getTipOgmios();
  console.log('tip', tip?.slot)
  return tip?.slot
}
//this function adds outputs for minted tokens
const mintedTokensOutputs = async (mintedValue: any, changeAddress: string, scriptAddr: any) => {
  let mintOutputs: any[] = []
  // console.log('mintedValue', mintedValue.toJson())
  Promise.all(
    Object.entries(mintedValue.toJson()).map(([policyId, assets]: any) => {
      // policyId !== '' && console.log('policyId', fromHex(policyId))
      // policyId !== '' && console.log('assets', assets)
      policyId !== '' &&
        Object.entries(assets).map(([assetName, quantity]: any) => {
          // policyId !== '' && console.log('policyId', scriptAddr.paymentCreds.hash)
          // assetName !== '' && console.log('assetName', assetName)
          // assetName !== '' && console.log('quantity', quantity)
          assetName !== '' &&
            mintOutputs.push({
              address: changeAddress,
              value: buildooor.Value.add(
                buildooor.Value.lovelaces(5_000_000),
                buildooor.Value.singleAsset(
                  scriptAddr.paymentCreds.hash,
                  fromHex(assetName),
                  quantity
                )
              )
            })
        })
    })
  )
  return mintOutputs
}

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
  let outputsbuildooor: buildooor.TxOut[] = []
  Promise.all(
    await utxoOutputs.map(async (output: any) => {
      outputsbuildooor.push(
        new buildooor.TxOut({
          address: buildooor.Address.fromString(output.address),
          value: await createOutputValues(output, txBuilder) // parse kupo value
          // datum: [], // parse kupo datum
          // refScript: [] // look for ref script if any
        })
      )
    })
  )
  return outputsbuildooor
}

const createOutputValues = async (output: any, txBuilder: any) => {
  // console.log("output", output);
  let outputAssets: any = []
  Promise.all(
    Object.entries(output.value).map(([key, value]: any) => {
      // console.log("key", key);
      // console.log("value", value);
      key === 'coins' && outputAssets.push(buildooor.Value.lovelaces(value))
      key === 'assets' &&
        Object.entries(value).length > 0 &&
        Object.entries(value).map(([asset, quantity]: any) => {
          let assetNew = buildooor.Value.singleAsset(
            new buildooor.Hash28(splitAsset(asset)[0]),
            fromHex(splitAsset(asset)[1]),
            quantity
          )
          outputAssets.push(assetNew)
        })
    })
  )
  let outputParsed = outputAssets.reduce(buildooor.Value.add)
  // console.log('outputParsed', outputParsed.toCbor().toString())
  const minUtxo = txBuilder.getMinimumOutputLovelaces(outputParsed.toCbor().toString())
  console.log('minUtxo', Number(minUtxo))

  outputAssets = []
  Promise.all(
    Object.entries(output.value).map(([key, value]: any) => {
      // console.log("key", key);
      // console.log("value", value);
      key === 'coins' && outputAssets.push(buildooor.Value.lovelaces(value + Number(minUtxo)))
      key === 'assets' &&
        Object.entries(value).length > 0 &&
        Object.entries(value).map(([asset, quantity]: any) => {
          let assetNew = buildooor.Value.singleAsset(
            new buildooor.Hash28(splitAsset(asset)[0]),
            fromHex(splitAsset(asset)[1]),
            quantity
          )
          outputAssets.push(assetNew)
        })
    })
  )
  outputParsed = outputAssets.reduce(buildooor.Value.add)
  // console.log('outputParsed', outputParsed.toCbor().toString())
  return outputParsed
}

const createDatumOutsputs = async (scriptAddrress: any, datumOutputs: any, vestingAddressPKH: any) => {
  // console.log('datumOutputs', datumOutputs)
  let datumOutputsParsed: any = []
  Promise.all(
    await datumOutputs.map((datum: any) => {
      // console.log('datum', datum)
      datumOutputsParsed.push({
        address: scriptAddrress,
        value: buildooor.Value.lovelaces( 10_000_000 ),
        datum: datum.VestingDatum({
            beneficiary: pluts.pBSToData.$( pluts.pByteString( vestingAddressPKH.toBuffer() ) ),
            deadline: pluts.pIntToData.$( nowPosix + 10_000 )
        })
    })
    })
  )
  return datumOutputsParsed
}
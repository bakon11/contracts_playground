// import * as React from 'react'
import { w3cwebsocket as W3CWebSocket } from "websocket";
import * as buildooor from "@harmoniclabs/buildooor";
// import { splitAsset } from '../lib/utils'
// import { OgmiosUtxos } from './utxosExample/'
import { fromHex } from "@harmoniclabs/uint8array-utils";

interface OgmiosRequest {
  jsonrpc: "2.0";
  method: string;
  params: object;
  id: string;
}
// Define the structure of each UTXO value
interface AssetValue {
  [key: string]: number;
}

interface UtxoValue {
  ada?: {
    lovelace: number;
  };
  [key: string]: AssetValue | undefined;
}

export interface Utxo {
  transaction: {
    id: string;
  };
  index: number;
  address: string;
  value: UtxoValue;
}

interface Result {
  lovelace: number;
  assets: {
    [key: string]: AssetValue;
  };
}

let ws: W3CWebSocket | null = null

export const wsp = (method: string, params: object): W3CWebSocket => {
  // Check if we already have an open connection
  // console.log("WebSocket connection:", ws)
  // console.log("WebSocket connection state:", ws?.readyState)
  // console.log("WebSocket connection open:", WebSocket.OPEN)
  if (ws && ws.readyState === 1) {
    console.log("WebSocket connection already open, reusing it.");
    const message: OgmiosRequest = {
      jsonrpc: "2.0",
      method,
      params,
      id: "null",
    };

    try {
      ws?.send(JSON.stringify(message));
    } catch (error) {
      console.error("Ogmios WS error on sending message:", error);
      sessionStorage.setItem("ogmiosHealth", "error");
    }
    return ws;
  }

  // If no connection exists or it's not open, proceed with creating one
  const backend =  JSON.stringify(["", "", "", ""]);
  const backendConfig = JSON.parse(backend);
  console.log("backend", backendConfig[0]);

  ws = new W3CWebSocket(backendConfig[1]);

  ws.onopen = () => {
    console.log("Ogmios Connection opened");
   
    const message: OgmiosRequest = {
      jsonrpc: "2.0",
      method,
      params,
      id: "init-1234-5678",
    };

    try {
      ws?.send(JSON.stringify(message));
    } catch (error) {
      console.error("Ogmios WS error on sending message:", error);
      // sessionStorage.setItem("ogmiosHealth", "error");
    }
  };

  ws.onerror = (error: Error) => {
    console.error("Ogmios Connection Error:", error);
    // sessionStorage.setItem("ogmiosHealth", "error");
  };

  ws.onclose = (event: any) => {
    console.log("Ogmios Connection closed:", event);
    // sessionStorage.setItem("ogmiosHealth", "closed");
    // ws = null; // Reset the WebSocket when it closes
  };

  return ws;
};

/*
##########################################################################################################
Fetching Chain info and Ogmios health
#############################d############################################################################
*/
export const ogmiosHealth = async () => {
  const requestOptions: any = {
    method: "GET",
    redirect: "follow",
  };

  let settings = {};
  settings = {
    method: "GET",
    headers: {},
    redirect: "follow",
  };
  try {
    const fetchResponse = await fetch(`$ogmiosServer/health`, requestOptions);
    const data = await fetchResponse.json();
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
    return e;
  }
};

export const getTipOgmios = async () => {
  const params = {};
  try {
    const tipWS = wsp("queryLedgerState/tip", params);
    return await new Promise((resolve, reject) => {
      tipWS.onmessage = (e: any) => {
        try {
          const results = JSON.parse(e.data);
          // console.log('WebSocket message received:', results)
          resolve(results.result);
        } catch (parseError) {
          console.error("Error parsing WebSocket message:", parseError);
          reject(parseError);
        }
      };

      tipWS.onerror = (error: Error) => {
        console.error("WebSocket error:", error);
        reject(error);
      };

      tipWS.onclose = (event: any) => {
        console.log("WebSocket connection closed:", event);
        if (!event.wasClean) {
          reject(new Error("WebSocket connection was closed unexpectedly"));
        } else {
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.error("Failed to get tip:", error);
    throw error;
  }

}

/*
##########################################################################################################
Fetch UTXOs for provided address
#############################d############################################################################
*/
export const getAddressUtxoInfoOgmios = async ( addresses: string[]): Promise<Utxo[] | null> => {
  const params = {
    addresses: [...addresses],
  };

  console.log("getting account info", addresses);

  try {
    const accountInfoWS = wsp("queryLedgerState/utxo", params);
    // console.log("accountInfoWS", accountInfoWS);
    return await new Promise((resolve, reject) => {
      accountInfoWS.onmessage = (e: any) => {
        try {
          const results = JSON.parse(e.data);
          // console.log("WebSocket message received:", results);
          resolve(results.result as Utxo[]); // Type assertion for Utxo array
        } catch (parseError) {
          console.error("Error parsing WebSocket message:", parseError);
          reject(parseError);
        }
      };

      accountInfoWS.onerror = (error: Error) => {
        console.error("WebSocket error:", error);
        reject(error);
      };

      accountInfoWS.onclose = (event: any) => {
        console.log("WebSocket connection closed:", event);
        if (!event.wasClean) {
          reject(new Error("WebSocket connection was closed unexpectedly"));
        } else {
          resolve(null); // Connection closed cleanly, but no data received
        }
      };
    });
  } catch (error) {
    console.error("Failed to get account info:", error);
    throw error; // Re-throw to be handled by the caller if needed
  }
};

/*
##########################################################################################################
THis is specifically for the Merkaba project build in wallet, this might have to go somewhere else.
#############################d############################################################################
*/
export const parseOgmiosUtxosForWallet = (utxos: Utxo[]): Result => {
  // utxos = OgmiosUtxos
  let totalLovelace: number = 0;
  const assets: { [key: string]: AssetValue } = {};

  // Loop through each UTXO
  utxos.forEach((utxo: Utxo) => {
    // Sum ADA
    if (utxo.value.ada && utxo.value.ada.lovelace !== undefined) {
      totalLovelace += utxo.value.ada.lovelace;
    }

    // Handle other assets
    Object.entries(utxo.value).forEach(([assetKey, assetValues]) => {
      if (assetKey !== "ada" && assetValues !== undefined) {
        if (!assets[assetKey]) {
          assets[assetKey] = {};
        }

        Object.entries(assetValues).forEach(([subKey, value]) => {
          if (value !== undefined) {
            if (!assets[assetKey][subKey]) {
              assets[assetKey][subKey] = 0;
            }
            assets[assetKey][subKey] += value;
          }
        });
      }
    });
  });

  // Result structure
  const result: Result = {
    lovelace: totalLovelace,
    assets: assets,
  };

  console.log("result, ", result);
  return result;
};

/*
##########################################################################################################
Generate inputs for PLU-TS from Ogmios utxo Inputs
#############################d############################################################################
*/
export const OgmiosUtxoToInputsBuildooor = async (utxoInputsOgmios: any) => {
  // console.log('utxoInputsOgmios', utxoInputsOgmios)
  let inputsBuildooor: any = [];
  Promise.all(
    await utxoInputsOgmios.map(async (utxo: any) => {
      // console.log("adding inputs")
      inputsBuildooor.push(
        new buildooor.UTxO({
          utxoRef: {
            id: utxo.transaction.id,
            index: utxo.index,
          },
          resolved: {
            address: buildooor.Address.fromString(utxo.address),
            value: await createInputValuesOgmios(utxo),
            datum:  utxo.datum && buildooor.dataFromCbor(utxo.datum), // parse kupo datum
            // refScript: [] // look for ref script if any
          },
        })
      );
      // console.log("address used", buildooor.Address.fromString(utxo.address).paymentCreds)
    })
  );
  const inputsParsed = inputsBuildooor.map((utxo: any) => ({ utxo: utxo }));
  return inputsBuildooor;
};

/*
####################################################################################################################################################################################################################
This function will create UTXO input values like: UTXO lovelaces and UTXO assets for PLU-TS to be used with paraseOgmiosUtxoTobuildooorTX() function
####################################################################################################################################################################################################################
*/
export const createInputValuesOgmios = async (utxo: any) => {
  // console.log("utxo", utxo);
  // for now will just pick first utxo object from array
  let assets: any = [];
  Promise.all(
    Object.entries(utxo.value).map(([key, value]: any) => {
      // console.log("key", key);
      // console.log("value", value);
      key === "ada" && assets.push(buildooor.Value.lovelaces(value.lovelace));
      key !== "ada" &&
        Object.entries(value).map(([asset, quantity]: any) => {
          // console.log("asset", fromBuffer(asset));
          // console.log("quantity", quantity);
          let assetNew = buildooor.Value.singleAsset(
            new buildooor.Hash28(key),
            fromHex(asset),
            quantity
          );
          assets.push(assetNew);
        });
    })
  );
  return assets.reduce(buildooor.Value.add);
};

/*
####################################################################################################################################################################################################################
The next cuple functions are for fetching latest protocl params from Ogmios and parsing them to be used with buildooor txBuilder.
####################################################################################################################################################################################################################
*/

interface ProtocolParameters {
  txFeePerByte: number;
  txFeeFixed: number;
  maxBlockBodySize: number;
  maxTxSize: number;
  maxBlockHeaderSize: number;
  stakeAddressDeposit: number;
  stakePoolDeposit: number;
  poolRetireMaxEpoch: number;
  stakePoolTargetNum: number;
  poolPledgeInfluence: number;
  monetaryExpansion: number;
  treasuryCut: number;
  protocolVersion: number[];
  minPoolCost: number;
  utxoCostPerByte: number;
  costModels: {
    PlutusScriptV1: [];
    PlutusScriptV2: [];
    PlutusScriptV3: [];
  };
  executionUnitPrices: buildooor.CborPositiveRational[];
  maxTxExecutionUnits: buildooor.ExBudget;
  maxBlockExecutionUnits: buildooor.ExBudget;
  maxValueSize: number;
  collateralPercentage: number;
  maxCollateralInputs: number;
}

export const getProtocolParametersOgmios =
  async (): Promise<ProtocolParameters | null> => {
    const params = {};
    try {
      const accountInfoWS = wsp("queryLedgerState/protocolParameters", params);
      return await new Promise((resolve, reject) => {
        accountInfoWS.onmessage = (e: any) => {
          try {
            const results = JSON.parse(e.data);
            // console.log('WebSocket message received:', results)
            const params = constructOgmiosProtocolParams(results.result);
            resolve(params); // Type assertion for Utxo array
          } catch (parseError) {
            console.error("Error parsing WebSocket message:", parseError);
            reject(parseError);
          }
        };

        accountInfoWS.onerror = (error: Error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };

        accountInfoWS.onclose = (event: any) => {
          console.log("WebSocket connection closed:", event);
          if (!event.wasClean) {
            reject(new Error("WebSocket connection was closed unexpectedly"));
          } else {
            resolve(null); // Connection closed cleanly, but no data received
          }
        };
      });
    } catch (error) {
      console.error("Failed to get account info:", error);
      throw error; // Re-throw to be handled by the caller if needed
    }
  };

/*
####################################################################################################################################################################################################################
Using current epoch protocol parmaters from Ogmios API for buildooor txBuilder, plutus cost models are hard coded for debugging.
#############################d######################################################################################################################################################################################
*/
export const constructOgmiosProtocolParams = async (protocolParams: any) => {
  // console.log('protocolParams', protocolParams)
  const defaultProtocolParameters: any = {
    txFeePerByte: protocolParams.minFeeCoefficient,
    txFeeFixed: protocolParams.minFeeConstant.ada.lovelace,
    maxBlockBodySize: protocolParams.maxBlockBodySize.bytes,
    maxTxSize: protocolParams.maxTransactionSize.bytes,
    maxBlockHeaderSize: protocolParams.maxBlockHeaderSize.bytes,
    stakeAddressDeposit: Number(
      protocolParams.stakeCredentialDeposit.ada.lovelace
    ),
    stakePoolDeposit: Number(protocolParams.stakePoolDeposit.ada.lovelace),
    poolRetireMaxEpoch: protocolParams.stakePoolRetirementEpochBound,
    stakePoolTargetNum: protocolParams.desiredNumberOfStakePools,
    poolPledgeInfluence:
      protocolParams.stakePoolPledgeInfluence.split("/")[0] /
      protocolParams.stakePoolPledgeInfluence.split("/")[1],
    monetaryExpansion:
      protocolParams.monetaryExpansion.split("/")[0] /
      protocolParams.monetaryExpansion.split("/")[1],
    treasuryCut:
      protocolParams.treasuryExpansion.split("/")[0] /
      protocolParams.treasuryExpansion.split("/")[1],
    protocolVersion: [
      protocolParams.version.major,
      protocolParams.version.minor,
    ],
    minPoolCost: Number(protocolParams.minStakePoolCost.ada.lovelace),
    utxoCostPerByte: Number(protocolParams.minUtxoDepositCoefficient),
    costModels: {
      PlutusScriptV1: [
        [
          100788, 420, 1, 1, 1000, 173, 0, 1, 1000, 59957, 4, 1, 11183, 32, 201305, 8356, 4, 16000,
          100, 16000, 100, 16000, 100, 16000, 100, 16000, 100, 16000, 100, 100, 100, 16000, 100,
          94375, 32, 132994, 32, 61462, 4, 72010, 178, 0, 1, 22151, 32, 91189, 769, 4, 2, 85848,
          228465, 122, 0, 1, 1, 1000, 42921, 4, 2, 24548, 29498, 38, 1, 898148, 27279, 1, 51775,
          558, 1, 39184, 1000, 60594, 1, 141895, 32, 83150, 32, 15299, 32, 76049, 1, 13169, 4,
          22100, 10, 28999, 74, 1, 28999, 74, 1, 43285, 552, 1, 44749, 541, 1, 33852, 32, 68246, 32,
          72362, 32, 7243, 32, 7391, 32, 11546, 32, 85848, 228465, 122, 0, 1, 1, 90434, 519, 0, 1,
          74433, 32, 85848, 228465, 122, 0, 1, 1, 85848, 228465, 122, 0, 1, 1, 270652, 22588, 4,
          1457325, 64566, 4, 20467, 1, 4, 0, 141992, 32, 100788, 420, 1, 1, 81663, 32, 59498, 32,
          20142, 32, 24588, 32, 20744, 32, 25933, 32, 24623, 32, 53384111, 14333, 10
        ]
      ],
      PlutusScriptV2: [
        [
          100788, 420, 1, 1, 1000, 173, 0, 1, 1000, 59957, 4, 1, 11183, 32, 201305, 8356, 4, 16000,
          100, 16000, 100, 16000, 100, 16000, 100, 16000, 100, 16000, 100, 100, 100, 16000, 100,
          94375, 32, 132994, 32, 61462, 4, 72010, 178, 0, 1, 22151, 32, 91189, 769, 4, 2, 85848,
          228465, 122, 0, 1, 1, 1000, 42921, 4, 2, 24548, 29498, 38, 1, 898148, 27279, 1, 51775,
          558, 1, 39184, 1000, 60594, 1, 141895, 32, 83150, 32, 15299, 32, 76049, 1, 13169, 4,
          22100, 10, 28999, 74, 1, 28999, 74, 1, 43285, 552, 1, 44749, 541, 1, 33852, 32, 68246, 32,
          72362, 32, 7243, 32, 7391, 32, 11546, 32, 85848, 228465, 122, 0, 1, 1, 90434, 519, 0, 1,
          74433, 32, 85848, 228465, 122, 0, 1, 1, 85848, 228465, 122, 0, 1, 1, 955506, 213312, 0, 2,
          270652, 22588, 4, 1457325, 64566, 4, 20467, 1, 4, 0, 141992, 32, 100788, 420, 1, 1, 81663,
          32, 59498, 32, 20142, 32, 24588, 32, 20744, 32, 25933, 32, 24623, 32, 43053543, 10,
          53384111, 14333, 10, 43574283, 26308, 10
        ]
      ],
      PlutusScriptV3: [
        100788, 420, 1, 1, 1000, 173, 0, 1, 1000, 59957, 4, 1, 11183, 32,
        201305, 8356, 4, 16000, 100, 16000, 100, 16000, 100, 16000, 100, 16000,
        100, 16000, 100, 100, 100, 16000, 100, 94375, 32, 132994, 32, 61462, 4,
        72010, 178, 0, 1, 22151, 32, 91189, 769, 4, 2, 85848, 123203, 7305,
        -900, 1716, 549, 57, 85848, 0, 1, 1, 1000, 42921, 4, 2, 24548, 29498,
        38, 1, 898148, 27279, 1, 51775, 558, 1, 39184, 1000, 60594, 1, 141895,
        32, 83150, 32, 15299, 32, 76049, 1, 13169, 4, 22100, 10, 28999, 74, 1,
        28999, 74, 1, 43285, 552, 1, 44749, 541, 1, 33852, 32, 68246, 32, 72362,
        32, 7243, 32, 7391, 32, 11546, 32, 85848, 123203, 7305, -900, 1716, 549,
        57, 85848, 0, 1, 90434, 519, 0, 1, 74433, 32, 85848, 123203, 7305, -900,
        1716, 549, 57, 85848, 0, 1, 1, 85848, 123203, 7305, -900, 1716, 549, 57,
        85848, 0, 1, 955506, 213312, 0, 2, 270652, 22588, 4, 1457325, 64566, 4,
        20467, 1, 4, 0, 141992, 32, 100788, 420, 1, 1, 81663, 32, 59498, 32,
        20142, 32, 24588, 32, 20744, 32, 25933, 32, 24623, 32, 43053543, 10,
        53384111, 14333, 10, 43574283, 26308, 10, 16000, 100, 16000, 100,
        962335, 18, 2780678, 6, 442008, 1, 52538055, 3756, 18, 267929, 18,
        76433006, 8868, 18, 52948122, 18, 1995836, 36, 3227919, 12, 901022, 1,
        166917843, 4307, 36, 284546, 36, 158221314, 26549, 36, 74698472, 36,
        333849714, 1, 254006273, 72, 2174038, 72, 2261318, 64571, 4, 207616,
        8310, 4, 1293828, 28716, 63, 0, 1, 1006041, 43623, 251, 0, 1, 100181,
        726, 719, 0, 1, 100181, 726, 719, 0, 1, 100181, 726, 719, 0, 1, 107878,
        680, 0, 1, 95336, 1, 281145, 18848, 0, 1, 180194, 159, 1, 1, 158519,
        8942, 0, 1, 159378, 8813, 0, 1, 107490, 3298, 1, 106057, 655, 1,
        1964219, 24520, 3,
      ],
    },
    executionUnitPrices: [
      //(protocolParams.scriptExecutionPrices.memory.split('/')[0] / protocolParams.scriptExecutionPrices.memory.split('/')[1]),
      //(protocolParams.scriptExecutionPrices.cpu.split('/')[0] / protocolParams.scriptExecutionPrices.cpu.split('/')[1])
      // new buildooor.CborPositiveRational(protocolParams.price_mem * 10000, 100), // mem
      // new buildooor.CborPositiveRational(protocolParams.price_step * 10000000, 1e5) // cpu
      // protocolParams.price_mem * 100,
      new buildooor.CborPositiveRational(
        (protocolParams.scriptExecutionPrices.memory.split("/")[0] /
          protocolParams.scriptExecutionPrices.memory.split("/")[1]) *
          10000,
        100
      ), // mem
      new buildooor.CborPositiveRational(
        (protocolParams.scriptExecutionPrices.cpu.split("/")[0] /
          protocolParams.scriptExecutionPrices.cpu.split("/")[1]) *
          10000000,
        1e5
      ), // cpu
    ],
    maxTxExecutionUnits: new buildooor.ExBudget({
      mem: protocolParams.maxExecutionUnitsPerTransaction.memory,
      cpu: protocolParams.maxExecutionUnitsPerTransaction.cpu,
    }),
    maxBlockExecutionUnits: new buildooor.ExBudget({
      mem: protocolParams.maxExecutionUnitsPerBlock.memory,
      cpu: protocolParams.maxExecutionUnitsPerBlock.cpu,
    }),
    maxValueSize: protocolParams.maxValueSize.bytes,
    collateralPercentage: protocolParams.collateralPercentage,
    maxCollateralInputs: protocolParams.maxCollateralInputs,
  };

  return defaultProtocolParameters;
};

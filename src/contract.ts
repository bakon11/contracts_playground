import { Address, bool, compile, makeValidator, Credential, pBool, pfn, Script, ScriptType, PScriptContext } from "@harmoniclabs/plu-ts";
import MyDatum from "./MyDatum";
import MyRedeemer from "./MyRedeemer";

export const contract = pfn([
    MyDatum.type,
    MyRedeemer.type,
    PScriptContext.type
],  bool)
(( datum, redeemer, ctx ) =>
    // always suceeds
    pBool( true )
);


///////////////////////////////////////////////////////////////////
// ------------------------------------------------------------- //
// ------------------------- utilities ------------------------- //
// ------------------------------------------------------------- //
///////////////////////////////////////////////////////////////////

export const untypedValidator = makeValidator( contract );

export const compiledContract = compile( untypedValidator );

export const script = new Script(
    ScriptType.PlutusV2,
    compiledContract
);

export const scriptMainnetAddr = new Address(
    "mainnet",
    Credential.script(
        script.hash
    )
);

export const scriptTestnetAddr = new Address(
    "testnet",
    Credential.script(
        script.hash.clone()
    )
);

export default contract;
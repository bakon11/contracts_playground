import { Address, compile, Credential, pfn, Script, ScriptType, PScriptContext, unit, passert } from "@harmoniclabs/plu-ts";

export const contract = pfn([
    PScriptContext.type
],  unit )
(( { redemeer, tx, purpose } ) => {
    // always suceeds
    return passert.$(true)
});


///////////////////////////////////////////////////////////////////
// ------------------------------------------------------------- //
// ------------------------- utilities ------------------------- //
// ------------------------------------------------------------- //
///////////////////////////////////////////////////////////////////

export const compiledContract = compile( contract );

export const script = new Script(
    ScriptType.PlutusV3,
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
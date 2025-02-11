import { Address, compile, Credential, pfn, Script, ScriptType, Builtin, Delay, UPLCConst, compileUPLC, UPLCProgram, ByteString, parseUPLC, PScriptContext, unit, plet, pmatch, perror, PMaybe, punsafeConvertType, pBool, passert, ptraceIfFalse, pStr, pdelay, data, Force, Application} from "@harmoniclabs/plu-ts";
import ProfileRedeemer from "../redeemers/ProfileRedeemer/ProfileRedeemer";

export const profile_contract = pfn([
    PScriptContext.type
],  unit )
(( { redeemer, tx, purpose } ) => {

    const maybeDatum = plet(
        pmatch(purpose)
        .onSpending(({ datum }) => datum)
        ._(_ => perror(PMaybe(data).type))
    );

    const datum = plet( punsafeConvertType( maybeDatum.unwrap, ProfileRedeemer.type ) )
    
    const signedByowner = tx.signatories.some( datum.owner.eq )



    return passert.$(
        (ptraceIfFalse.$(pdelay(pStr("Error in signedByBenificiary"))).$(signedByowner))
    );
    // always succeeds
    // return passert.$(true)
});


///////////////////////////////////////////////////////////////////
// ------------------------------------------------------------- //
// ------------------------- utilities ------------------------- //
// ------------------------------------------------------------- //
///////////////////////////////////////////////////////////////////

export const compiledProfileContract = compile( profile_contract );

export const profileContractScript = new Script(
    ScriptType.PlutusV3,
    compiledProfileContract
);

export const profileScriptMainnetAddr = new Address(
    "mainnet",
    Credential.script(
        profileContractScript.hash
    )
);

export const profileSccriptTestnetAddr = new Address(
    "testnet",
    Credential.script(
        profileContractScript.hash.clone()
    )
);
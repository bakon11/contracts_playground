import { Address, compile, Credential, pfn, Script, ScriptType, Builtin, Delay, UPLCConst, compileUPLC, UPLCProgram, ByteString, parseUPLC, PScriptContext, unit, plet, pmatch, perror, PMaybe, punsafeConvertType, pBool, passert, ptraceIfFalse, pStr, pdelay, data, Force, Application} from "@harmoniclabs/plu-ts";
import VestingDatumRedeemer from "../redeemers/VestingDatumRedeemer";

export const profile_contract = pfn([
    PScriptContext.type
],  unit )
(( { redeemer, tx, purpose } ) => {

    const maybeDatum = plet(
        pmatch(purpose)
        .onSpending(({ datum }) => datum)
        ._(_ => perror(PMaybe(data).type))
    );

    const datum = plet( punsafeConvertType( maybeDatum.unwrap, VestingDatumRedeemer.type ) )
    
    const signedByBeneficiary = tx.signatories.some( datum.beneficiary.eq )

    // inlined
    const deadlineReached = plet(
        pmatch( tx.interval.from.bound )
        .onPFinite(({ n: lowerInterval }) =>
            datum.deadline.ltEq( lowerInterval ) 
        )
        ._( _ => pBool( false ) )
    )

    return passert.$(
        (ptraceIfFalse.$(pdelay(pStr("Error in signedByBenificiary"))).$(signedByBeneficiary))
        .and( ptraceIfFalse.$(pdelay(pStr("deadline not reached or not specified"))).$( deadlineReached ) )
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
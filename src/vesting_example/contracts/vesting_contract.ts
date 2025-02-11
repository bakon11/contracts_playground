import { Address, compile, Credential, pfn, Script, ScriptType, Builtin, Delay, UPLCConst, compileUPLC, UPLCProgram, ByteString, parseUPLC, PScriptContext, unit, plet, pmatch, perror, PMaybe, punsafeConvertType, pBool, passert, ptraceIfFalse, pStr, pdelay, data, Force, Application} from "@harmoniclabs/plu-ts";
import VestingDatum from "../redeemers/VestingDatumRedeemer/VestingDatumRedeemer";

export const contract = pfn([
    PScriptContext.type
],  unit )
(( { redeemer, tx, purpose } ) => {

    const maybeDatum = plet(
        pmatch(purpose)
        .onSpending(({ datum }) => datum)
        ._(_ => perror(PMaybe(data).type))
    );

    const datum = plet( punsafeConvertType( maybeDatum.unwrap, VestingDatum.type ) )
    
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

export const largeUplcScript = () => {
    const uplcProgram = parseUPLC(compiledContract);
    console.log("uplcProgram: ", uplcProgram)
    const uplc = uplcProgram.body;
    console.log("uplc: ", uplc)
    const bigNumber = 10_000;
    const largeUplc = new Force(
        new Application(
            new Application(
                new Application( Builtin.ifThenElse, UPLCConst.bool( true ) ),
                    new Delay( uplc )    
            ),
            new Delay( UPLCConst.byteString( new ByteString( new Uint8Array( bigNumber ) ) ) )
        )
    );
    console.log("largeUplc: ", largeUplc)
    const compiledLargeUplc = compileUPLC(
        new UPLCProgram(uplcProgram.version, largeUplc)
    ).toBuffer().buffer
    
    console.log("compiledLargeUplc: ", compiledLargeUplc);

    const largeUplcScript = new Script(
        ScriptType.PlutusV3,
        compiledLargeUplc
    );
    console.log("largeUplcScript: ", largeUplcScript);

    return largeUplcScript;
}
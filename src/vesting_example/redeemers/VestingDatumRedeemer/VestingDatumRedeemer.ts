import { PPubKeyHash, int, pstruct } from "@harmoniclabs/plu-ts";

// modify the Datum as you prefer
const VestingDatum = pstruct({
    VestingDatum: {
        beneficiary: PPubKeyHash.type,
        deadline: int // posix time
    }
});

export default VestingDatum;
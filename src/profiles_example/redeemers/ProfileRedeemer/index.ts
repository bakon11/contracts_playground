import { PPubKeyHash, int, str, pstruct } from "@harmoniclabs/plu-ts";

// modify the Datum as you prefer
const MandalaProfileRedeemer = pstruct({
    VestingDatum: {
        owner: PPubKeyHash.type, // owner of the profile by pub key hash
        pfpImage: str, // string location of pfp probably IPFS in this case
        clan: str, // string of the clan name
        created_at: int, // posix time
        updated_at: int, // posix time
        created_epoch: int, //epoch
        updated_epoch: int, //epoch,
        name: str,
        country: str,
        city: str,
        primary_clan: str,
        secondary_clan: str,
        discord_name: str,
        did: str,
        pool: str,
        cell: str,
        pfp: str,
        shadow: str,
        nft_type: str,
        cell_join_epoch: int,
        fellowship: str,
        fellowship_join_epoch: int,
        fellowship_name: str,

    }
});

export default MandalaProfileRedeemer;
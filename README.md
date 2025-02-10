# Cardano PLU-TS Stuff

This is just a collection of different contracts/validators/redeemers and transactions, written using Harmonic Labs [Buildooor](https://github.com/HarmonicLabs/buildooor) for off-chain TXs and [Pebble](https://github.com/HarmonicLabs/plu-ts/tree/pebble) for on-chain contracts/validators/redeemers.

I created this open source repo in case it could potentially help others in their own projects and to help me experiment and develop with PLU-TS.

There are going to be all sort of experiments here as well, so please use at your own risk. 

## Documentation

[Here you find documentation on how to use `plu-ts`](https://www.harmoniclabs.tech/plu-ts-docs/index.html)

Feel free to contribute to the [`plu-ts-docs` repository](https://github.com/HarmonicLabs/plut-ts-docs)

# Run the Code

The different TS scripts are in the `src/__scripts__/` directory. Make sure you create a `.env` file based on the `env_example`.

You will at the least need an Ogmios/Cardano-node instance.

## Setup

1. **Clone the Repository:**
   ```sh
   git clone [your_repo_url]
   cd [your_repo_folder]
2. `npm install`
3. I would also recommend installing `ts-node` globally. 
4. run any of the scripts: `ts-node --env-file=.env src/vesting_example/__scripts__/createVestingUTXO.ts`

# Run in demeter.run

[demeter.run](https://demeter.run) is a browser environment that allows you to set up Cardano infrastructures to use in your projects, for example `Ogmios`.
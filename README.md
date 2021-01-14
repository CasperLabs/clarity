# Casper Explorer

The purpose of the explorer is to help users interact with the blockchain:

- Sign up to participate in TestNet
- Create accounts (public/private key pairs)
- Ask the faucet for tokens on TestNet
- Explore the block DAG
- Deploy contracts

## Install

You could use `yarn run bootstrap` to install all dependencies

## Build

You can use `yarn build` in the root directories to build and use `yarn run dev` to interactively develop the components.

To package the whole thing into a docker image, run `make docker-build-all` in the project root directory.

## Test

You can use `yarn test` in the project root directory to run the unit tests.

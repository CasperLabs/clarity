# CasperLabs Explorer Server

This is the server side component for the CasperLabs Explorer:

- serves the static files for the UI
- provide an API for the faucet

## Available scripts

Since we are using yarn workspace, you don't have to run scripts in separate component directory.

## Environment variables

You can start the server in once console and the UI in another, the UI will proxy the requests to the backend, and also get the configuration from the `config.js` file served by the backend.

There are some environment variables that can come handy:

- `UI_GRPC_URL`: By default this is empty, or set it to `http://localhost:8000/rpc` to use reverse proxy provided by Express.
- `AUTH_MOCK_ENABLED`: By setting it to `true` you can work offline and be automatically logged in with a test user to create accounts and use the faucet.
- `NETWORK_NAME`: Network name, show in top of Clarity website.
- `JSON_RPC_URL`: The location of casper-node that provides the rpc service.
- `CHAIN_NAME`: Which chain the deploy is supposed to be run on.
- `REACT_APP_EVENT_STORE_URL`: The location of event-store, which serve the `EventStoreService`

## Useful links:

- https://facebook.github.io/create-react-app/docs/deployment
- https://www.fullstackreact.com/articles/using-create-react-app-with-a-server/
- https://auth0.com/docs/quickstart/spa/vanillajs/02-calling-an-api
- https://developer.okta.com/blog/2018/11/15/node-express-typescript
- https://blog.envoyproxy.io/envoy-and-grpc-web-a-fresh-new-alternative-to-rest-6504ce7eb880

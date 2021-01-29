const got = require('got');
const readline = require('readline');
const Storage = require('./storage');
const models = require('../src/models/index');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/eh-config.json')[env];

class EventHandler {
    constructor() {}

    /**
     * Returns readable stream when provided with url of event stream.
     * Url can be created with EventHandler.formURL()
     * 
     * @param {string} url 
     */
    async createInputStream(url) {
        try {
            // Still to implement retry on failed connection
            const readStream = readline.createInterface({
                input: got.stream(url),
                crlfDelay: Infinity
            });

            return readStream;
        } catch (err) {
            if (err instanceof got.stream.RequestError) {
                throw new Error("Connection Failed - check the status of the node:\n" + err);
            } else {
                throw new Error(err);
            }
        }
    }

    /**
     * Returns writeable stream pointed to the storage component
     */
    async createStorage() {
        
        // Sync database schema.
        if (env == "production") {
            (async () => {
                console.log("Syncing database schema...");
                await models.sequelize.sync({ force: false, logging: false });
                console.log("Syncing database schema... DONE");
            })();
        }
                
        // Initialise storage
        return new Storage(models);
    }

    /**
     * Attempts to create a streaming pipeline given an input and output stream.
     * 
     * @param {readline.Interface} inputStream
     * @param {Storage} storage
     */
    async createPipeline(inputStream, storage) {
        inputStream.on('line', async (eventString) => {
            if (!eventString.startsWith('data')) {
                return;
            }

            try {
                const event = JSON.parse(eventString.substr(5));
                if (event.DeployProcessed) {
                    await storage.onDeployProcessed(event.DeployProcessed);
                } else if (event.BlockAdded) {
                    await storage.onBlockAdded(event.BlockAdded);
                }
            } catch (err) {
                console.log(`Error while processing an event.\nEvent: ${eventString}\nError: ${err}`);
            }
        });
    }


    /**
     * Returns a url based on given args.
     * If all args are omitted then it will return the default url of:
     * http://localhost:50101/events  -  The node event stream when using nctl.
     * This is defined and is configurable in eh-config.json
     * 
     * @param {string} protocol 
     * @param {string} domain 
     * @param {int} port 
     * @param {string} path 
     */
    async formURL(
        protocol,
        domain,
        port,
        path
    ) {

        // Set defaults if args not passed
        this.protocol = (protocol !== undefined) ? protocol : config.EH_STREAM_PROTOCOL;
        this.domain = (domain !== undefined) ? domain : config.EH_STREAM_DOMAIN;
        this.port = (port !== undefined) ? port : config.EH_STREAM_PORT;
        this.path = (path !== undefined) ? path : config.EH_STREAM_PATH;

        return (
            this.protocol + "://" + 
            this.domain +
            (this.port 
                ? ":" + this.port
                : ""
            ) +
            (this.path
                ? "/" + this.path
                : ""
            ) 
        );

    }

}

// For debugging
if (env !== 'test') {

    runEventHandler = async () => {

        let eventHandler = new EventHandler();
        let nodeUrl = await eventHandler.formURL();
        let eventStream = await eventHandler.createInputStream(nodeUrl);
        let storage = await eventHandler.createStorage();

        eventHandler.createPipeline(eventStream, storage);
    }

    runEventHandler();
}

module.exports = EventHandler
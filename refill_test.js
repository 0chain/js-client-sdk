/* 
* This file is part of the 0chain js-client-sdk distribution (https://github.com/0chain/js-client-sdk).
* Copyright (c) 2018 0chain LLC.
* 
* 0chain js-client-sdk program is free software: you can redistribute it and/or modify  
* it under the terms of the GNU General Public License as published by  
* the Free Software Foundation, version 3.
*
* This program is distributed in the hope that it will be useful, but 
* WITHOUT ANY WARRANTY; without even the implied warranty of 
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU 
* General Public License for more details.
*
* You should have received a copy of the GNU General Public License 
* along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

var sdk = require('./index');

var utils = require('./utils');

/*
* Initializes 0chain js-client-sdk. Must be called once before calling SDK functions
*/

var config = {
    miners: [
        // "http://m000.kendevsc.testnet-0chain.net:7071/",
        // "http://m001.kendevsc.testnet-0chain.net:7071/",
        // "http://m002.kendevsc.testnet-0chain.net:7071/"
        "http://m000.olga.testnet-0chain.net:7071/",
      "http://m001.olga.testnet-0chain.net:7071/",
      "http://m002.olga.testnet-0chain.net:7071/",
      "http://m003.olga.testnet-0chain.net:7071/",
      "http://m004.olga.testnet-0chain.net:7071/",
      "http://m005.olga.testnet-0chain.net:7071/"
    ],
    sharders: [
        // "http://s000.kendevsc.testnet-0chain.net:7171/"
        "http://s000.olga.testnet-0chain.net:7171/",
      "http://s001.olga.testnet-0chain.net:7171/"
    ],
    clusterName: "Test"
}

sdk.init(config);  // init with custom server configuration

//sdk.init(); // to use default local host servers

var sample_mnemonic = "critic drop upper panther bean test arch announce problem put harsh flower";

// sdk.restoreFaucetWallet(sample_mnemonic)
sdk.restoreOwnerWallet(sample_mnemonic)
    .then((response) => {
        console.log("Client recovered Successfully ....");
        return response;
    })
    .then(async (client) => {
        console.log("Waiting 3 seconds ....", client);
        await utils.sleep(3000);
        // return sdk.executeFaucetSmartContract(client, "UpdateLimits", {periodic_limit:50,pour_limit:10, global_limit:10000}, 0);
        // return sdk.executeFaucetSmartContract(client, "Pour", {}, 100);
        return sdk.executeFaucetSmartContract(client, "refill", {}, 10000000000000000);
    })
    // .then(async (client) => {
    //     console.log("Waiting 3 seconds ....", client);
    //     await utils.sleep(3000);
    //     return sdk.executeFaucetSmartContract(client, "Pour", {}, 1);
    // })
    .then(async (pour_tx) => {
        console.log("Waiting 3 seconds ....", pour_tx);
        await utils.sleep(9000);
        return sdk.checkTransactionStatus(pour_tx.hash);
    })
    .then((pour_tx_detail) => {
        console.log("pour_tx_detail", pour_tx_detail);
    })
    .catch((error) => {
        console.log("My Error", error)
    });    
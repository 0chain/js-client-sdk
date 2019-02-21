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
        "http://localhost:7071/",
        "http://localhost:7072/",
        "http://localhost:7073/"
    ],
    sharders: [
        "http://localhost:7171/"
    ],
    clusterName: "Test"
}

sdk.init(config);  // init with custom server configuration

//sdk.init(); // to use default local host servers

var sample_mnemonic = "critic drop upper panther bean test arch announce problem put harsh flower";

sdk.restoreFaucetWallet(sample_mnemonic)
    .then((response) => {
        console.log("Client recovered Successfully ....");
        return response;
    })
    .then(async (client) => {
        console.log("Waiting 3 seconds ....", client);
        await utils.sleep(3000);
        // return sdk.executeInterestPoolSmartContract(client, "lockTokens",{"pool_type":1}, 10);
        return sdk.executeInterestPoolSmartContract(client, "unlockTokens",{}, 0);
        // return sdk.executeInterestPoolSmartContract(client, "getPoolsStats",{}, 0);
    })
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
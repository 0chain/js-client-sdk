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
        "http://localhost:7071/",
        "http://localhost:7072/",
        "http://localhost:7073/"
    ],
    sharders: [
        // "http://s000.kendevsc.testnet-0chain.net:7171/"
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
        // return sdk.executeZRC20SmartContract(client, "createToken",{"exchange_rate":{"zcn":2,"Other":1},"token_name":"other_other_cool_token","total_supply":9,"available":11}, 0);
        return sdk.executeZRC20SmartContract(client, "totalSupply",{"token_name":"other_other_cool_token"}, 0);
        // return sdk.executeZRC20SmartContract(client, "balanceOf",{"from_token_name":"cool_token","from_pool":"c8a5e74c2f4fae2c1bed79fb2b78d3b88f844bbb6bf1db5fc43240711f23321f"}, 0);
        // return sdk.executeZRC20SmartContract(client, "digPool",{"from_token_name":"other_other_cool_token"}, 2);
        // return sdk.executeZRC20SmartContract(client, "fillPool",{"token_name":"cool_coin", "to_pool":"c8a5e74c2f4fae2c1bed79fb2b78d3b88f844bbb6bf1db5fc43240711f23321f"}, 9);
        // return sdk.executeZRC20SmartContract(client, "transferTo",{"from_token_name":"cool_token","to_token_name":"other_other_cool_token","from_pool":"c8a5e74c2f4fae2c1bed79fb2b78d3b88f844bbb6bf1db5fc43240711f23321f","to_pool":"c8a5e74c2f4fae2c1bed79fb2b78d3b88f844bbb6bf1db5fc43240711f23321f","value": 1}, 0);
        // return sdk.executeZRC20SmartContract(client, "drainPool",{}, 8);
        // return sdk.executeZRC20SmartContract(client, "emptyPool",{}, 8);
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
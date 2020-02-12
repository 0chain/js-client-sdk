/* 
* This file is part of the 0chain js-client distribution (https://github.com/0chain/js-client-sdk).
* Copyright (c) 2018 0chain LLC.
* 
* 0chain js-client program is free software: you can redistribute it and/or modify  
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

const nacl = require('tweetnacl');
const sha3 = require('js-sha3');
const bip39 = require('bip39');
var BlueBirdPromise = require("bluebird");
const bls = require('bls-wasm');

//local import 
const utils = require('./utils');
var models = require('./models');
"use strict";

var miners, sharders, clusterName, version;

const StorageSmartContractAddress = "6dba10422e368813802877a85039d3985d96760ed844092319743fb3a76712d7";
const FaucetSmartContractAddress = "6dba10422e368813802877a85039d3985d96760ed844092319743fb3a76712d3";
const InterestPoolSmartContractAddress = "6dba10422e368813802877a85039d3985d96760ed844092319743fb3a76712d9";


const Endpoints = {
    REGISTER_CLIENT: 'v1/client/put',
    PUT_TRANSACTION: 'v1/transaction/put',

    GET_RECENT_FINALIZED: "v1/block/get/recent_finalized",
    GET_LATEST_FINALIZED: "v1/block/get/latest_finalized",
    GET_CHAIN_STATS: "v1/chain/get/stats",
    GET_BLOCK_INFO: "v1/block/get",
    CHECK_TRANSACTION_STATUS: "v1/transaction/get/confirmation",
    GET_BALANCE: "v1/client/get/balance",

    GET_SCSTATE: "v1/scstate/get",
    
    // SC REST
    SC_REST : "v1/screst/",
    SC_REST_ALLOCATION: "v1/screst/"+StorageSmartContractAddress+"/allocation",
    SC_BLOBBER_STATS : "v1/screst/"+StorageSmartContractAddress+"/getblobbers",

    GET_LOCKED_TOKENS: "v1/screst/"+InterestPoolSmartContractAddress+"/getPoolsStats",

    //BLOBBER
    ALLOCATION_FILE_LIST: "/v1/file/list/",
    FILE_META: "/v1/file/meta/"
}

const TransactionType = {
    SEND: 0, // A transaction to send tokens to another account, state is maintained by account
    DATA: 10, // A transaction to just store a piece of data on the block chain
    // STORAGE_WRITE : 101, // A transaction to write data to the blobber
    // STORAGE_READ  : 103,// A transaction to read data from the blobber
    SMART_CONTRACT: 1000 // A smart contract transaction type
}

module.exports = {

    BlockInfoOptions: {
        HEADER: "header",
        FULL: "full"
    },

    AllocationTypes: {
        FREE : "Free",
        PREMIUM: "Premium",
        MONETIZE: "Monetize"
    },

    /////////////SDK Stuff below //////////////
    init: function init(configObject) {
        var config;
        if (typeof configObject != "undefined" && configObject.hasOwnProperty('miners') &&
            configObject.hasOwnProperty('sharders') && configObject.hasOwnProperty('clusterName')) {
            config = configObject;
        }
        else {
            const jsonContent = {
                "miners": [
                    "http://localhost:7071/",
                    "http://localhost:7072/",
                    "http://localhost:7073/"
                ],
                "sharders": [
                    "http://localhost:7171/"
                ],
                "transaction_timeout": 15,
                "clusterName": "local"
            };
            config = jsonContent;
        }
        miners = config.miners;
        sharders = config.sharders;
        clusterName = config.clusterName;
        version = "0.8.0";
    },

    getSdkMetadata: () => {
        return "version: " + version + " cluster: " + clusterName;
    },

    getChainStats: () => {
        return getInformationFromRandomSharder(Endpoints.GET_CHAIN_STATS, {}, (rawData) => {
            return new models.ChainStats(rawData)
        });
    },

    getRecentFinalized: () => {
        return getInformationFromRandomSharder(Endpoints.GET_RECENT_FINALIZED, {}, (rawData) => {
            var blocks = [];
            for (let bs of rawData) {
                blocks.push(new models.BlockSummary(bs));
            }
            return blocks;
        });
    },

    getLatestFinalized: () => {
        return getInformationFromRandomSharder(Endpoints.GET_LATEST_FINALIZED, {}, (rawData) => {
            return new models.BlockSummary(rawData)
        });
    },

    getBlockInfoByHash: function getBlockInfoByHash(hash, options = this.BlockInfoOptions.HEADER) {
        const blockInfoOptions = this.BlockInfoOptions;
        return getInformationFromRandomSharder(Endpoints.GET_BLOCK_INFO, { block: hash, content: options }, (rawData) => {
            if (options == blockInfoOptions.HEADER) {
                return new models.BlockSummary(rawData.header);
            } else {
                return new models.Block(rawData.block);
            }
        });

    },

    getBlockInfoByRound: function getBlockInfoByRound(round, options = this.BlockInfoOptions.HEADER) {
        const blockInfoOptions = this.BlockInfoOptions;
        return getInformationFromRandomSharder(Endpoints.GET_BLOCK_INFO, { round: round, content: options }, (rawData) => {
            if (options == blockInfoOptions.HEADER) {
                return new models.BlockSummary(rawData.header);
            } else {
                return new models.Block(rawData.block);
            }
        });
    },

    getBalance: (client_id) => {
        return new Promise(async function (resolve, reject) {
            utils.getConsensusedInformationFromSharders(sharders,Endpoints.GET_BALANCE,{ client_id: client_id })
            .then((res) => {
                resolve(res);
            })
            .catch((error) => {
                if(error.error === "value not present") {
                    resolve({
                        balance: 0
                    })
                }
                else {
                    reject(error);
                }
            })
        });
        // return getInformationFromRandomSharder(Endpoints.GET_BALANCE, { client_id: client_id });
    },

    getLockedTokens: (client_id) => {
        return new Promise(async function (resolve, reject) {
            utils.getConsensusedInformationFromSharders(sharders,Endpoints.GET_LOCKED_TOKENS,{ client_id: client_id })
            .then((res) => {
                resolve(res);
            })
            .catch((error) => {
                if(error.error === "failed to get stats: no pools exist") {
                    resolve({
                        locked_tokens: {}
                    })
                }
                else {
                    reject(error);
                }
            })
        });
    },

    checkTransactionStatus: (hash) => {

        return utils.getConsensusedInformationFromSharders(sharders,Endpoints.CHECK_TRANSACTION_STATUS,{ hash: hash },(rawData) => {
            return new models.TransactionDetail(rawData)
        });

        // return getInformationFromRandomSharder(Endpoints.CHECK_TRANSACTION_STATUS, { hash: hash }, (rawData) => {
        //     return new models.TransactionDetail(rawData)
        // });
    },

    registerClient: () => {
        const mnemonic = bip39.generateMnemonic()
        return createWallet(mnemonic);
    },

    validateMnemonic: (mnemonic) => {
        return bip39.validateMnemonic(mnemonic)
    },

    restoreWallet: (mnemonic) => {
        return createWallet(mnemonic);
    },

    storeData: (ae, payload) => {
        const toClientId = "";
        return submitTransaction(ae, toClientId, 0, payload, TransactionType.DATA);
    },

    sendTransaction: (ae, toClientId, val, note) => {
        return submitTransaction(ae, toClientId, val, note, TransactionType.SEND);
    },

    //Smart contract address need to pass in toClientId
    executeSmartContract: (ae, to_client_id, payload, transactionValue = 0) => {
        const toClientId = typeof to_client_id === "undefined" ? StorageSmartContractAddress : to_client_id;
        return submitTransaction(ae, toClientId, transactionValue, payload, TransactionType.SMART_CONTRACT);
    },

    getStorageSmartContractStateForKey: (keyName, keyvalue) => {
        return utils.getConsensusedInformationFromSharders(sharders,Endpoints.GET_SCSTATE,{ key: keyName+":"+keyvalue, sc_address: StorageSmartContractAddress  });
        // return getInformationFromRandomSharder(Endpoints.GET_SCSTATE, { key: keyName+":"+keyvalue, sc_address: StorageSmartContractAddress  });
    },

    allocateStorage: function allocateStorage(ae, num_writes, data_shards, parity_shards, type, size, expiration_date) {
        const payload = {
            name: "new_allocation_request",
            input: {
                num_writes: num_writes,
                data_shards: data_shards,
                parity_shards: parity_shards,
                type: type,
                size: size,
                expiration_date: expiration_date
            }
        }
        return this.executeSmartContract(ae, undefined, JSON.stringify(payload));
    },

    allocationInfo: function allocationInfo(id){
        return utils.getConsensusedInformationFromSharders(sharders,Endpoints.SC_REST_ALLOCATION ,{ allocation: id });
    },

    getAllBlobbers: function getAllBlobbers() {
        return utils.getConsensusedInformationFromSharders(sharders,Endpoints.SC_BLOBBER_STATS ,{});
    },

    getAllocationFilesFromPath: (allocation_id, blobber_list, path) => {

        return new Promise(async function (resolve, reject) {

            var blobber_url, data;
            var files = [];
    
            for (let blobber of blobber_list) {
                try {
                    blobber_url = blobber + Endpoints.ALLOCATION_FILE_LIST + allocation_id;
                    data = await sdk.utils.getReq(blobber_url, {path: path});
    
                    if (data.entries != null && data.entries.length > 0) {
    
                        for (let file_data of data.entries) {
                            /* files not contains the element we're looking for so add */
                            if (!files.some(e => e.LookupHash === file_data.LookupHash)) {
                                files.push(file_data);
                            }
                        }
                    }
                }
                catch (error) {
                    // console.log(error);
                }
            }
            resolve(files);

        });

    },

    getFileMetaDataFromBlobber: (allocation_id, blobber_url, path, fileName) => {
        return sdk.utils.getReq(blobber_url + allocation_id, {path: path, filename: fileName});
    },

    getAllocationDirStructure: function () {

    },

    /** Faucets Apis */

    executeFaucetSmartContract : function(ae,methodName, input, transactionValue) {
        const payload = {
            name: methodName,
            input: input
        }
        return this.executeSmartContract(ae, FaucetSmartContractAddress, JSON.stringify(payload), transactionValue);
    },

    Wallet: models.Wallet,
    ChainStats: models.ChainStats,
    BlockSummary: models.BlockSummary,
    Block: models.Block,
    Transaction: models.Transaction,
    TransactionDetail: models.TransactionDetail,
    Confirmation: models.Confirmation,
    merkle_tree_path: models.merkle_tree_path,
    VerificationTicket: models.VerificationTicket,
    utils: utils,
    TransactionType: TransactionType

}

///^^^^^^  End of expored functions   ^^^^^^////////

// This method will try to get the information from any one of the sharder randomly
// 1. shuffle the array 
// 2. try get the information from first sharder in the array. if its success will return immedialtely with response otherwise try to get from next sharder until it reach end of array
async function getInformationFromRandomSharder(url, params, parser) {

    var errResp = [];

    return new Promise(async (resolve, reject) => {
        const urls = sharders.map(sharder => sharder + url);
        const promises = urls.map(url => utils.getReq(url, params));
        BlueBirdPromise.some(promises, 1)
            .then(function (result) {
                if (result[0].data) {
                    const data = typeof parser !== "undefined" ? parser(result[0].data) : result[0].data;
                    resolve(data);
                }
            })
            .catch(BlueBirdPromise.AggregateError, function (err) {
                reject({ error: err[0].code });
                // err.forEach(function (e) {
                //     console.error(e.stack);
                // });
            });


        // for (let sharder of utils.shuffleArray(sharders)) {
        //     //console.log("Calling sharder .....", sharder)
        //     try {
        //         response = await utils.getReq(sharder + url, params); //sharder + url
        //         //console.log("response from sharder",response.data);
        //         if (response.data) {
        //             const data = typeof parser !== "undefined" ? parser(response.data) : response.data;
        //             resolve(data);
        //             break;
        //         }
        //     }
        //     catch (error) {
        //         errResp.push({ "sharder": sharder, "error": error });
        //     }
        // }
        // reject(errResp);
    });

}

function createWallet(mnemonic) {
    const seed = bip39.mnemonicToSeed(mnemonic).slice(32);
    const keys = nacl.sign.keyPair.fromSeed(seed);//nacl.sign.keyPair();
    const key = utils.byteToHexString(keys.publicKey);
    const id = sha3.sha3_256(keys.publicKey);
    const sKey = utils.byteToHexString(keys.secretKey);

    var data = {};
    data.public_key = key;
    data.id = id;

    return new Promise(function (resolve, reject) {
        utils.doParallelPostReqToAllMiners(miners, Endpoints.REGISTER_CLIENT, data)
            .then((response) => {
                const myaccount = response;
                myaccount.entity.secretKey = sKey;
                myaccount.entity.mnemonic = mnemonic;
                var ae = new models.Wallet(myaccount.entity);
                resolve(ae);
            })
            .catch((error) => {
                reject(error);
            })
    });
}

function submitTransaction(ae, toClientId, val, note, transaction_type) {

    bls.init(bls.BN254).then((response)=> {
        console.log('BLS INITIALIZED SUCCESSFULLY', response)
        resolve(response)
    })
    .catch((err)=> {
        console.log("COULDN'T INITIALIZE BLS", err)
        reject(err)
    })

    const hashPayload = sha3.sha3_256(note);
    const ts = Math.floor(new Date().getTime() / 1000);

    const hashdata = ts + ":" + ae.id + ":" + toClientId + ":" + val + ":" + hashPayload;

    const hash = sha3.sha3_256(hashdata);
    const signedData = nacl.sign.detached(utils.hexStringToByte(hash),
        utils.hexStringToByte(ae.secretKey));

    var data = {};
    data.client_id = ae.id;
    data.transaction_value = val;
    data.transaction_data = note;
    data.transaction_type = transaction_type;
    data.creation_date = ts;
    data.to_client_id = toClientId;
    data.hash = hash;
    data.signature = utils.byteToHexString(signedData);

    return new Promise(function (resolve, reject) {
        utils.doParallelPostReqToAllMiners(miners, Endpoints.PUT_TRANSACTION, data)
            .then((response) => {
                resolve(new models.Transaction(response.entity));
            })
            .catch((error) => {
                reject(error);
            })
    });

}

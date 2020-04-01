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

// const nacl = require('tweetnacl');
const sha3 = require('js-sha3');
const bip39 = require('bip39');
var BlueBirdPromise = require("bluebird");

//local import 
const utils = require('./utils');
var models = require('./models');
"use strict";

var miners, proxyServerUrl, sharders, clusterName, version;
let bls;

const StorageSmartContractAddress = "6dba10422e368813802877a85039d3985d96760ed844092319743fb3a76712d7";
const FaucetSmartContractAddress = "6dba10422e368813802877a85039d3985d96760ed844092319743fb3a76712d3";
const InterestPoolSmartContractAddress = "6dba10422e368813802877a85039d3985d96760ed844092319743fb3a76712d9";
const MinerSmartContractAddress= "6dba10422e368813802877a85039d3985d96760ed844092319743fb3a76712d1";

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
    SC_REST_ALLOCATIONS: "v1/screst/"+StorageSmartContractAddress+"/allocations",
    SC_BLOBBER_STATS : "v1/screst/"+StorageSmartContractAddress+"/getblobbers",

    GET_LOCKED_TOKENS: "v1/screst/"+InterestPoolSmartContractAddress+"/getPoolsStats",
    GET_USER_POOLS: "v1/screst/"+MinerSmartContractAddress+"/getUserPools",

    //BLOBBER
    ALLOCATION_FILE_LIST: "/v1/file/list/",
    FILE_STATS_ENDPOINT: "/v1/file/stats/",
    OBJECT_TREE_ENDPOINT: "/v1/file/objecttree/",
    FILE_META_ENDPOINT: "/v1/file/meta/",
    RENAME_ENDPOINT: "/v1/file/rename/",
    COPY_ENDPOINT: "/v1/file/copy/",
    UPLOAD_ENDPOINT: "/v1/file/upload/",
    COMMIT_ENDPOINT: "/v1/connection/commit/",
    COPY_ENDPOINT: "/v1/file/copy/",

    PROXY_SERVER_UPLOAD_ENDPOINT: "/upload",
    PROXY_SERVER_DOWNLOAD_ENDPOINT: "/download",
    PROXY_SERVER_SHARE_ENDPOINT: "/share",
    PROXY_SERVER_RENAME_ENDPOINT: "/rename",
    PROXY_SERVER_COPY_ENDPOINT: "/copy",
    PROXY_SERVER_DELETE_ENDPOINT: "/delete",
    PROXY_SERVER_MOVE_ENDPOINT: "/move"
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
    init: function init(configObject, bls_wasm) {
        var config;
        if (typeof configObject != "undefined" && configObject.hasOwnProperty('miners') &&
            configObject.hasOwnProperty('sharders') && configObject.hasOwnProperty('clusterName') && configObject.hasOwnProperty('proxyServerUrl')) {
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
                "proxyServerUrl": "http://localhost:9082",
                "transaction_timeout": 15,
                "clusterName": "local"
            };
            config = jsonContent;
        }
        bls = bls_wasm;
        bls.init(bls.BN254)
        miners = config.miners;
        sharders = config.sharders;
        clusterName = config.clusterName;
        proxyServerUrl = config.proxyServerUrl
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
                resolve({
                    locked_tokens: []
                })
            })
        });
    },

    getUserPools: (client_id) => {
        return new Promise(async function (resolve, reject) {
            utils.getConsensusedInformationFromSharders(sharders,Endpoints.GET_USER_POOLS,{ client_id: client_id })
            .then((res) => {
                if (res.pools===null){
                    resolve({
                        pools: []
                    })
                }
                resolve(res);
            })
            .catch((error) => {
                resolve({
                    pools: []
                })
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

    allocateStorage: function allocateStorage(ae, data_shards = 2, parity_shards = 2, size = 2147483648, expiration_date = 2592000, num_writes = 0) {
        const payload = {
            name: "new_allocation_request",
            input: {
                data_shards: data_shards,
                parity_shards: parity_shards,
                owner_id: ae.id,
                owner_public_key: ae.public_key,
                size: size,
                expiration_date: expiration_date,
                num_writes: num_writes
            }
        }
        return this.executeSmartContract(ae, undefined, JSON.stringify(payload));
    },

    updateAllocation: function updateAllocation(ae, allocation_id, expiration_date = 2592000, size = 2147483648){
        const payload = {
            name: "update_allocation_request",
            input: {
                id: allocation_id,
                size: size,
                expiration_date: expiration_date
            }
        }
        return this.executeSmartContract(ae, undefined, JSON.stringify(payload));
    },

    allocationInfo: function allocationInfo(id){
        return utils.getConsensusedInformationFromSharders(sharders,Endpoints.SC_REST_ALLOCATION ,{ allocation: id });
    },

    listAllocations: function listAllocations(id){
        return utils.getConsensusedInformationFromSharders(sharders, Endpoints.SC_REST_ALLOCATIONS ,{ client: id })
    },

    createLockTokens: async function(ae, val, durationHr, durationMin){
        const payload = {
            name: "lock",
            input: {
                duration: `${durationHr}h${durationMin}m`
            }
        }
        return this.executeSmartContract(ae, InterestPoolSmartContractAddress, JSON.stringify(payload), val)
    },

    unlockTokens: async function(ae, poolId){ 
        const payload = {
            name: "unlock",
            input: {
                poolId: poolId
            }
        }
        return this.executeSmartContract(ae, InterestPoolSmartContractAddress, JSON.stringify(payload))
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

    getFileMetaDataFromPath: async function (allocation_id, path, client_id){
        const completeAllocationInfo = await this.allocationInfo(allocation_id);
        const blobber = completeAllocationInfo.blobbers[0].url;
        return new Promise(async function (resolve, reject) {
            const blobber_url = blobber + Endpoints.FILE_META_ENDPOINT + allocation_id;
            const response = await utils.postReqToBlobber(blobber_url, {}, {path: path}, client_id);
            if (response.status===200){
                resolve(response.data)
            }else{
                reject('Not able to fetch file details from blobbers')
            }
        });
    },

    getFileStatsFromPath: async function (allocation_id, path, client_id){
        const completeAllocationInfo = await this.allocationInfo(allocation_id);
        const blobber = completeAllocationInfo.blobbers[0].url;
        return new Promise(async function (resolve, reject) {
            const blobber_url = blobber + Endpoints.FILE_STATS_ENDPOINT + allocation_id;
            const response = await utils.postReqToBlobber(blobber_url, {}, {path: path}, client_id);
            if (response.status===200){
                resolve(response.data)
            }else{
                reject('Not able to fetch file stats from blobbers')
            }
        });
    },
    
    getFileMetaDataFromPathHash: async function (allocation_id, path_hash, client_id) {
        const completeAllocationInfo = await this.allocationInfo(allocation_id);
        const blobber = completeAllocationInfo.blobbers[0].url;
        return new Promise(async function (resolve, reject) {
            const blobber_url = blobber + Endpoints.FILE_META_ENDPOINT + allocation_id;
            const response = await utils.postReqToBlobber(blobber_url, {}, { path_hash: path_hash }, client_id);
            if (response.status === 200) {
                resolve(response.data)
            } else {
                reject('Not able to fetch file details from blobbers')
            }
        });
    },

    commitMetaTransaction: async function (ae, crudType, allocation_id, path, auth_ticket='', metadata='') {
        if (metadata.length===0) {
            if (path.length > 0) {
                metadata = await this.getFileMetaDataFromPath(allocation_id, path, ae.id)
            } else if (auth_ticket.length > 0) {
                const at = utils.parseAuthTicket(auth_ticket)
                metadata = await this.getFileMetaDataFromPathHash(allocation_id, at.file_path_hash, ae.id)
            }
        }
        const { name, type, lookup_hash, actual_file_hash, mimetype, size, encrypted_key } = metadata
        const payload = {
            CrudType: crudType,
            MetaData: {
                Name: name,
                Type: type,
                Path: path,
                LookupHash: lookup_hash,
                Hash: actual_file_hash,
                MimeType: mimetype,
                Size: size,
                EncryptedKey: encrypted_key
            }
        }
        return submitTransaction(ae, '', 0, JSON.stringify(payload));
    },
    
    uploadObject: async function(payload){
        const url = proxyServerUrl + Endpoints.PROXY_SERVER_UPLOAD_ENDPOINT
        const parsed_client_json = utils.parseWalletInfo(JSON.parse(payload.get('client_json')))
        payload.set('client_json', JSON.stringify(parsed_client_json))
        const response = await utils.postReq(url, payload);
        return response
    },

    downloadObject: async function(allocation_id, path, client_json){
        const url = proxyServerUrl + Endpoints.PROXY_SERVER_DOWNLOAD_ENDPOINT
        const parsed_client_json = utils.parseWalletInfo(client_json)
        const params = {
            allocation: allocation_id,
            remote_path: path,
            client_json: parsed_client_json
        }
        const response = await utils.getDownloadReq(url, params);
        return response.request.responseURL
    },

    renameObject: async function (allocation_id, path, new_name, client_json) {
        const url = proxyServerUrl + Endpoints.PROXY_SERVER_RENAME_ENDPOINT
        const parsed_client_json = utils.parseWalletInfo(client_json)
        const formData = new FormData();
        formData.append('allocation', allocation_id);
        formData.append('remote_path', path);
        formData.append('new_name', new_name);
        formData.append('client_json', JSON.stringify(parsed_client_json));
        const response = await utils.putReq(url, formData);
        return response
    },

    deleteObject: async function (allocation_id, path, client_json) {
        const url = proxyServerUrl + Endpoints.PROXY_SERVER_DELETE_ENDPOINT
        const parsed_client_json = utils.parseWalletInfo(client_json)
        const formData = new FormData();
        formData.append('allocation', allocation_id);
        formData.append('remote_path', path);
        formData.append('client_json', JSON.stringify(parsed_client_json));
        const response = await utils.delReq(url, formData);
        return response
    },

    copyObject: async function (allocation_id, path, dest, client_json) {
        const url = proxyServerUrl + Endpoints.PROXY_SERVER_COPY_ENDPOINT
        const parsed_client_json = utils.parseWalletInfo(client_json)
        const formData = new FormData();
        formData.append('allocation', allocation_id);
        formData.append('remote_path', path);
        formData.append('dest_path', dest);
        formData.append('client_json', JSON.stringify(parsed_client_json));
        const response = await utils.putReq(url, formData);
        return response
    },

    shareObject: async function (allocation_id, path, client_json) {
        const url = proxyServerUrl + Endpoints.PROXY_SERVER_SHARE_ENDPOINT
        const parsed_client_json = utils.parseWalletInfo(client_json)        
        const params = {
            allocation: allocation_id,
            remote_path: path,
            client_json: parsed_client_json
        }
        const response = await utils.getReq(url, params);
        return response
    },

    moveObject: async function (allocation_id, path, client_json) {
        const url = proxyServerUrl + Endpoints.PROXY_SERVER_MOVE_ENDPOINT
        const parsed_client_json = utils.parseWalletInfo(client_json)   
        const formData = new FormData();
        formData.append('allocation', allocation_id);
        formData.append('remote_path', path);
        formData.append('dest_path', dest);
        formData.append('client_json', JSON.stringify(parsed_client_json));
        const response = await utils.putReq(url, formData);
        return response
    },

    getAllocationDirStructure: function () {

    },

    /** Faucets Apis */

    executeFaucetSmartContract : function(ae, methodName, input, transactionValue) {
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
    const blsSecret = new bls.SecretKey();
    blsSecret.setByCSPRNG()
    const key = blsSecret.getPublicKey().serializeToHexStr();
    const id = sha3.sha3_256(utils.hexStringToByte(key));
    const sKey = blsSecret.serializeToHexStr();
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


async function submitTransaction(ae, toClientId, val, note, transaction_type) {

    const hashPayload = sha3.sha3_256(note);
    const ts = Math.floor(new Date().getTime() / 1000);

    const hashdata = ts + ":" + ae.id + ":" + toClientId + ":" + val + ":" + hashPayload;

    const hash = sha3.sha3_256(hashdata);
    const bytehash = utils.hexStringToByte(hash);
    const sec = new bls.SecretKey();
	sec.deserializeHexStr(ae.secretKey);
	const sig = sec.sign(bytehash);

    var data = {};
    data.client_id = ae.id;
    data.transaction_value = val;
    data.transaction_data = note;
    data.transaction_type = transaction_type;
    data.creation_date = ts;
    data.to_client_id = toClientId;
    data.hash = hash;
    data.signature = sig.serializeToHexStr();
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

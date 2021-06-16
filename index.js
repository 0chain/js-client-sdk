/* 
* This file is part of the 0chain @zerochain/0chain distribution (https://github.com/0chain/js-client-sdk).
* Copyright (c) 2018 0chain LLC.
* 
* 0chain @zerochain/0chain program is free software: you can redistribute it and/or modify  
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

var miners, proxyServerUrl, zeroBoxUrl, sharders, clusterName, version;
var preferredBlobbers, tokenLock;
var readPrice, writePrice;
let bls;

// const StorageSmartContractAddress = "6dba10422e368813802877a85039d3985d96760ed844092319743fb3a76712d7";
// const FaucetSmartContractAddress = "6dba10422e368813802877a85039d3985d96760ed844092319743fb3a76712d3";
// const InterestPoolSmartContractAddress = "6dba10422e368813802877a85039d3985d96760ed844092319743fb3a76712d9";
// const MinerSmartContractAddress = "6dba10422e368813802877a85039d3985d96760ed844092319743fb3a76712d1";

const MultiSigSmartContractAddress = '27b5ef7120252b79f9dd9c05505dd28f328c80f6863ee446daede08a84d651a7';
const VestingSmartContractAddress = '2bba5b05949ea59c80aed3ac3474d7379d3be737e8eb5a968c52295e48333ead';
const FaucetSmartContractAddress = '6dba10422e368813802877a85039d3985d96760ed844092319743fb3a76712d3';
const ZRC20SmartContractAddress = '6dba10422e368813802877a85039d3985d96760ed844092319743fb3a76712d5';
const StorageSmartContractAddress = '6dba10422e368813802877a85039d3985d96760ed844092319743fb3a76712d7';
const MinerSmartContractAddress = '6dba10422e368813802877a85039d3985d96760ed844092319743fb3a76712d9';
const InterestPoolSmartContractAddress = 'cf8d0df9bd8cc637a4ff4e792ffe3686da6220c45f0e1103baa609f3f1751ef4';

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
    SC_REST: "v1/screst/",
    SC_REST_ALLOCATION: "v1/screst/" + StorageSmartContractAddress + "/allocation",
    SC_REST_ALLOCATIONS: "v1/screst/" + StorageSmartContractAddress + "/allocations",
    SC_REST_READPOOL_STATS: "v1/screst/" + StorageSmartContractAddress + "/getReadPoolStat",
    SC_REST_WRITEPOOL_STATS: "v1/screst/" + StorageSmartContractAddress + "/getWritePoolStat",
    SC_BLOBBER_STATS: "v1/screst/" + StorageSmartContractAddress + "/getblobbers",
    SC_SHARDER_LIST: "v1/screst/" + MinerSmartContractAddress + "/getSharderList",
    SC_MINERS_STATS: "v1/screst/" + MinerSmartContractAddress + "/getMinerList",
    SC_REST_ALLOCATION_MIN_LOCK: "v1/screst/" + StorageSmartContractAddress + "/allocation_min_lock",

    GET_LOCKED_TOKENS: "v1/screst/" + InterestPoolSmartContractAddress + "/getPoolsStats",
    GET_USER_POOLS: "v1/screst/" + MinerSmartContractAddress + "/getUserPools",

    //STAKING
    GET_STORAGESC_POOL_STATS: "v1/screst/" + StorageSmartContractAddress + "/getUserStakePoolStat",
    GET_MINERSC_POOL_STATS: "v1/screst/" + MinerSmartContractAddress + "/getUserPools",

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
    OBJECT_TREE_ENDPOINT: '/v1/file/objecttree/',
    COMMIT_META_TXN_ENDPOINT: "/v1/file/commitmetatxn/",

    PROXY_SERVER_UPLOAD_ENDPOINT: "/upload",
    PROXY_SERVER_DOWNLOAD_ENDPOINT: "/download",
    PROXY_SERVER_SHARE_ENDPOINT: "/share",
    PROXY_SERVER_RENAME_ENDPOINT: "/rename",
    PROXY_SERVER_COPY_ENDPOINT: "/copy",
    PROXY_SERVER_DELETE_ENDPOINT: "/delete",
    PROXY_SERVER_MOVE_ENDPOINT: "/move",
    PROXY_SERVER_ENCRYPT_PUBLIC_KEY_ENDPOINT: "/publicEncryptionKey",

    // ZEROBOX URLs
    ZEROBOX_SERVER_GET_MNEMONIC_ENDPOINT: '/getmnemonic',
    ZEROBOX_SERVER_SHARE_INFO_ENDPOINT: '/shareinfo',
    ZEROBOX_SERVER_SAVE_MNEMONIC_ENDPOINT: '/savemnemonic',
    ZEROBOX_SERVER_DELETE_MNEMONIC_ENDPOINT: '/shareinfo',
    ZEROBOX_SERVER_REFERRALS_INFO_ENDPOINT: '/getreferrals',
    ZEROBOX_SERVER_FREE_ALLOCATION: '/v2/createallocation',
    ZEROBOX_SERVER_DELETE_EXIST_ALLOCATION: '/v2/deleteallocation',
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
        FREE: "Free",
        PREMIUM: "Premium",
        MONETIZE: "Monetize"
    },

    /////////////SDK Stuff below //////////////
    init: function init(configObject, bls_wasm) {
        var config;
        if (typeof configObject != "undefined" && configObject.hasOwnProperty('miners') &&
            configObject.hasOwnProperty('sharders')
            && configObject.hasOwnProperty('clusterName')
            && configObject.hasOwnProperty('proxyServerUrl')) {
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
                "preferredBlobbers": [
                    "http://localhost:7051/",
                    "http://localhost:7052/",
                    "http://localhost:7053/",
                    "http://localhost:7054/"
                ],
                "readPrice": {
                    "min": 0,
                    "max": 0
                },
                "writePrice": {
                    "min": 0,
                    "max": 0
                },
                "tokenLock": 0,
                "proxyServerUrl": "http://localhost:9082",
                "zeroBoxUrl": "http://one.0box.io:9081",
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
        proxyServerUrl = config.proxyServerUrl;
        zeroBoxUrl = config.zeroBoxUrl;
        preferredBlobbers = config.preferredBlobbers;
        readPriceRange = config.readPrice;
        writePriceRange = config.writePrice;
        tokenLock = config.tokenLock;
        dataShards = config.dataShards;
        parityShards = config.parityShards;
        allocationSize = parseInt(config.allocationSize * 1073741824);
        tokenLock = config.tokenLock;
        maxChallengeCompletionTime = parseInt(config.maxChallengeCompletionTime * 1000000000)
        version = "0.8.0";
    },


    getSdkMetadata: () => {
        return "version: " + version + " cluster: " + clusterName;
    },

    createWalletAndDesiredAllocation: async function () {
        let responseObj = null;
        return await this.registerClient()
            .then((activeWallet) => {
                responseObj = { activeWallet: activeWallet };
                return this.executeFaucetSmartContract(activeWallet, "pour", {}, (10 ** 10))
            })
            .then((response) => {
                responseObj = { ...responseObj, fucetToken: response }
                return this.allocateStorage(responseObj.activeWallet, dataShards, parityShards, allocationSize, tokenLock);
            })
            .then((response) => {
                responseObj = { ...responseObj, allocateStorage: response };
                return this.lockTokensInReadPool(responseObj.activeWallet, response.hash, 2592000000000000, 5000000000);
            })
            .then((response) => {
                responseObj = { ...responseObj, readPoolLockToken: response }
                return responseObj;
            })
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
            utils.getConsensusedInformationFromSharders(sharders, Endpoints.GET_BALANCE, { client_id: client_id })
                .then((res) => {
                    resolve(res);
                })
                .catch((error) => {
                    if (error.error === "value not present") {
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
            utils.getConsensusedInformationFromSharders(sharders, Endpoints.GET_LOCKED_TOKENS, { client_id: client_id })
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
            utils.getConsensusedInformationFromSharders(sharders, Endpoints.GET_USER_POOLS, { client_id: client_id })
                .then((res) => {
                    if (res.pools === null) {
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
        return utils.getConsensusedInformationFromSharders(sharders, Endpoints.CHECK_TRANSACTION_STATUS, { hash: hash }, (rawData) => {
            return new models.TransactionDetail(rawData)
        });

        // return getInformationFromRandomSharder(Endpoints.CHECK_TRANSACTION_STATUS, { hash: hash }, (rawData) => {
        //     return new models.TransactionDetail(rawData)
        // });
    },

    createKeys: () => {
        const mnemonic = bip39.generateMnemonic(256)
        const keys = createWalletKeys(mnemonic)
        return {
            ...keys,
            mnemonic
        }
    },

    registerClient: async function registerClient() {
        const mnemonic = bip39.generateMnemonic(256);
        const wallet = await createWallet(mnemonic);
        //creating read pool
        await this.createReadPool(wallet)
        return wallet;
    },

    createReadPool: async function createReadPool(ae) {
        const payload = {
            name: "new_read_pool",
            input: null
        }
        return this.executeSmartContract(
            ae,
            undefined,
            JSON.stringify(payload)
        );
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
        return utils.getConsensusedInformationFromSharders(sharders, Endpoints.GET_SCSTATE, { key: keyName + ":" + keyvalue, sc_address: StorageSmartContractAddress });
        // return getInformationFromRandomSharder(Endpoints.GET_SCSTATE, { key: keyName+":"+keyvalue, sc_address: StorageSmartContractAddress  });
    },

    allocateStorage: function allocateStorage(
        ae,
        data_shards = dataShards,
        parity_shards = parityShards,
        size = allocationSize,
        lockTokens = tokenLock,
        preferred_blobbers = null,
        writePrice = writePriceRange,
        readPrice = readPriceRange,
        max_challenge_completion_time = maxChallengeCompletionTime,
        expiration_date = new Date(),
    ) {

        Date.prototype.addDays = function (days) {
            var date = new Date(this.valueOf());
            date.setDate(date.getDate() + days);
            return date;
        }

        expiration_date = Math.floor(expiration_date.addDays(30).getTime() / 1000)

        const payload = {
            name: "new_allocation_request",
            input: {
                data_shards,
                parity_shards,
                owner_id: ae.id,
                owner_public_key: ae.public_key,
                size,
                expiration_date,
                read_price_range: readPrice,
                write_price_range: writePrice,
                max_challenge_completion_time,
                preferred_blobbers,
            },
        };

        return this.executeSmartContract(
            ae,
            undefined,
            JSON.stringify(payload),
            lockTokens
        );
    },

    updateAllocation: function updateAllocation(ae, allocation_id, expiration_date = 2592000, size = 2147483648, tokens) {
        const payload = {
            name: "update_allocation_request",
            input: {
                owner_id: ae.id,
                id: allocation_id,
                size: size,
                expiration_date: expiration_date
            }
        }
        return this.executeSmartContract(ae, undefined, JSON.stringify(payload), tokens);
    },

    allocationInfo: function allocationInfo(id) {
        return utils.getConsensusedInformationFromSharders(sharders, Endpoints.SC_REST_ALLOCATION, { allocation: id });
    },

    listAllocations: function listAllocations(id) {
        return utils.getConsensusedInformationFromSharders(sharders, Endpoints.SC_REST_ALLOCATIONS, { client: id })
    },

    allocationMinLock: function allocationMinLock(ae, data, parity, size, preferredBlobber,
        writePrice = writePriceRange,
        readPrice = readPriceRange,
        challengeCompletionTime,
        expiration_days = 30) {
        
        let expiration_date = new Date();

        Date.prototype.addDays = function (days) {
            var date = new Date(this.valueOf());
            date.setDate(date.getDate() + days);
            return date;
        }

        expiration_date = Math.floor(expiration_date.addDays(expiration_days).getTime() / 1000)

        return utils.getConsensusedInformationFromSharders(sharders, Endpoints.SC_REST_ALLOCATION_MIN_LOCK, {
            allocation_data: {
                data_shards: data,
                parity_shards: parity,
                owner_id: ae.id,
                owner_public_key: ae.public_key,
                size: size,
                expiration_date,
                read_price_range: readPrice,
                write_price_range: writePrice,
                max_challenge_completion_time: challengeCompletionTime,
                preferred_blobbers: preferredBlobber ? preferredBlobber : null
            }
        })
    },

    readPoolInfo: function readPoolInfo(id) {
        return utils.getConsensusedInformationFromSharders(
            sharders,
            Endpoints.SC_REST_READPOOL_STATS,
            { client_id: id }
        )
    },

    writePoolInfo: function writePoolInfo(id) {
        return utils.getConsensusedInformationFromSharders(
            sharders,
            Endpoints.SC_REST_WRITEPOOL_STATS,
            { client_id: id }
        )
    },

    storagescLockToken: async function (ae, val, id) {
        const payload = {
            name: "stake_pool_lock",
            input: { blobber_id: id }
        }
        return this.executeSmartContract(ae, StorageSmartContractAddress, JSON.stringify(payload), val);
    },

    minerscAndSharderscLockToken: async function (ae, val, id, type) {
        const payload = {
            name: "addToDelegatePool",
            input: { id, type }
        }
        return this.executeSmartContract(ae, MinerSmartContractAddress, JSON.stringify(payload), val)
    },

    requstUnstakeMinerSharderToken: async function (ae, pool_id, id, type) {
        const payload = {
            name: "deleteFromDelegatePool",
            input: { pool_id, id, type }
        }
        return this.executeSmartContract(ae, MinerSmartContractAddress, JSON.stringify(payload))
    },

    requstUnstakeBlobberToken: async function (ae, pool_id, id) {
        const payload = {
            name: "stake_pool_unlock",
            input: { pool_id, blobber_id: id }
        }
        return this.executeSmartContract(ae, StorageSmartContractAddress, JSON.stringify(payload))
    },

    getMinersShardersBlobbers: async function () {
        const urls = {
            minersList: Endpoints.SC_MINERS_STATS,
            shardersList: Endpoints.SC_SHARDER_LIST,
            blobbersList: Endpoints.SC_BLOBBER_STATS,
        };
        const activeList = {
            minersList: miners,
            shardersList: sharders
        }

        const response = {};
        for (let index in miners) {
            let isAllSuccess = true;
            for (let url in urls) {
                await utils.getReq(miners[index] + urls[url], {})
                    .then((res) => {
                        let activeUrls;
                        if (url != "blobbersList") {
                            let active = activeList[url];
                            activeUrls = res.data && res.data.Nodes && res.data.Nodes.filter((value) => {
                                const url = value.simple_miner.host + ":" + value.simple_miner.port;
                                let check=false;
                                for (let val of active) {
                                    if (val.indexOf(url.slice(0, -6))  !== -1){
                                        check=true;
                                        return true
                                    }
                                }
                                if(check) return true;
                                return false;
                            })
                        } else {
                            activeUrls = res.data.Nodes.filter(
                                (value) => new Date().getTime() - new Date(value.last_health_check * 1000).getTime() < 3600000
                            );
                        }
                        response[url] = activeUrls
                    })
                    .catch((err) => {
                        response[url] = [];
                        isAllSuccess = false;
                    });
            }
            if (isAllSuccess)
                break;
        }
        return response
    },

    getStakeLockedToken: (client_id) => {
        return new Promise(async function (resolve, reject) {
            let minerSharderStake = await utils.getConsensusedInformationFromSharders(sharders, Endpoints.GET_MINERSC_POOL_STATS, { client_id })
                .then((res) => {
                    return res;
                })
                .catch((error) => {
                    return null;
                })

            if (minerSharderStake === null) {
                minerSharderStake = [];
            }

            let blobberStake = await utils.getConsensusedInformationFromSharders(sharders, Endpoints.GET_STORAGESC_POOL_STATS, { client_id })
                .then((res) => {
                    return res;
                })
                .catch((error) => {
                    return null;
                })

            if (blobberStake === null) {
                blobberStake = [];
            }

            resolve({
                pools: { ...minerSharderStake.pools, blobber: { ...blobberStake.pools } }
            })
        });
    },

    createLockTokens: async function (ae, val, durationHr, durationMin) {
        const payload = {
            name: "lock",
            input: {
                duration: `${durationHr}h${durationMin}m`
            }
        }
        return this.executeSmartContract(ae, InterestPoolSmartContractAddress, JSON.stringify(payload), val)
    },


    // duration, allocID, blobberID,
    // 		zcncore.ConvertToValue(tokens), zcncore.ConvertToValue(fee)

    lockTokensInReadPool: async function (ae, allocation, duration, tokens) {
        const payload = {
            name: "read_pool_lock",
            input: {
                duration: duration,
                allocation_id: allocation
            }
        }
        return this.executeSmartContract(ae, undefined, JSON.stringify(payload), tokens)
    },

    lockTokensInWritePool: async function (ae, allocation, duration, tokens) {
        const payload = {
            name: "write_pool_lock",
            input: {
                duration: duration,
                allocation_id: allocation
            }
        }
        return this.executeSmartContract(ae, undefined, JSON.stringify(payload), tokens)
    },

    unlockTokens: async function (ae, poolId) {
        const payload = {
            name: "unlock",
            input: {
                pool_id: poolId
            }
        }
        return this.executeSmartContract(ae, InterestPoolSmartContractAddress, JSON.stringify(payload))
    },

    writePoolTokenUnlock: async function (ae, poolId) {
        const payload = {
            name: "write_pool_unlock",
            input: {
                pool_id: poolId
            }
        }
        return this.executeSmartContract(ae, StorageSmartContractAddress, JSON.stringify(payload))
    },

    readPoolTokenUnlock: async function (ae, poolId) {
        const payload = {
            name: "read_pool_unlock",
            input: {
                pool_id: poolId
            }
        }
        return this.executeSmartContract(ae, StorageSmartContractAddress, JSON.stringify(payload))
    },

    getAllBlobbers: function getAllBlobbers() {
        return utils.getConsensusedInformationFromSharders(sharders, Endpoints.SC_BLOBBER_STATS, {})
            .then((res) => {
                const response = res.Nodes.filter((value) =>
                    new Date().getTime() - new Date(value.last_health_check * 1000).getTime() < 3600000
                );
                return response;
            });
    },
    getAllBlobbersDetails: async function getAllBlobbersDetails() {
      const currentBlobbers = await this.getAllBlobbers();
      const detailedBlobbers = currentBlobbers.map((blobber)=>{ 
          const blobberUrl = new URL(blobber.url)
          blobber.convertedUrl = blobberUrl.protocol+'//'+blobberUrl.hostname +'/blobber'+ blobberUrl.port.slice(-2)+'/_statsJSON'
          return blobber;
      })
      const  detailedBlobbersCallingEachApi = await Promise.all(detailedBlobbers.map(async (dBl)=>{
          const blobData = await fetch(dBl.convertedUrl)
          const blobJson = await blobData.json()
          return {...blobJson,...dBl};
     }))  
      return detailedBlobbersCallingEachApi ;
    },
    

    getAllocationSharedFilesFromPath: async function (allocation_id, lookup_hash, client_id, auth_token = "") {
        var blobber_url;
        const completeAllocationInfo = await this.allocationInfo(allocation_id);
        blobber = completeAllocationInfo.blobbers[0].url;
        blobber_url = blobber + Endpoints.ALLOCATION_FILE_LIST + allocation_id
        const list = await utils.getReqBlobbers(blobber_url, { path_hash: lookup_hash, auth_token: auth_token }, client_id);

        return list
    },

    getAllocationFilesFromPath: async function (allocation_id, path, client_id) {
        var blobber_url;

        const completeAllocationInfo = await this.allocationInfo(allocation_id);
        blobber = completeAllocationInfo.blobbers[0].url;
        blobber_url = blobber + Endpoints.ALLOCATION_FILE_LIST + allocation_id

        const list = await utils.getReqBlobbers(blobber_url, { path: path }, client_id);

        return list
    },

    getAllocationFilesFromHash: async function (allocation_id, lookup_hash, client_id) {
        var blobber_url;
        const completeAllocationInfo = await this.allocationInfo(allocation_id);
        blobber = completeAllocationInfo.blobbers[0].url;
        blobber_url = blobber + Endpoints.ALLOCATION_FILE_LIST + allocation_id

        const list = await utils.getReqBlobbers(blobber_url, { path_hash: lookup_hash }, client_id);

        return list
    },

    getFileMetaDataFromPath: async function (allocation_id, path, client_id) {
        const completeAllocationInfo = await this.allocationInfo(allocation_id);
        const blobber = completeAllocationInfo.blobbers[0].url;
        return new Promise(async function (resolve, reject) {
            const blobber_url = blobber + Endpoints.FILE_META_ENDPOINT + allocation_id;
            const response = await utils.postReqToBlobber(blobber_url, {}, { path: path }, client_id);
            if (response.status === 200) {
                const res = {
                    ...response.data,
                    blobbers: completeAllocationInfo.blobbers
                }
                resolve(res)
            } else {
                reject('Not able to fetch file details from blobbers')
            }
        });
    },

    getFileStatsFromPath: async function (allocation_id, path, client_id) {
        const completeAllocationInfo = await this.allocationInfo(allocation_id);
        return new Promise(async function (resolve, reject) {
            let allBlobbersResponse = []
            for (let blobber of completeAllocationInfo.blobbers) {
                const blobber_url = blobber.url + Endpoints.FILE_STATS_ENDPOINT + allocation_id;
                await utils.postReqToBlobber(blobber_url, {}, { path: path }, client_id)
                    .then((response) => {
                        allBlobbersResponse.push({ ...response.data, url: blobber.url })
                    }).catch((err) => {
                        console.log(err)
                    })
            }
            if (allBlobbersResponse.length > 0) {
                resolve(allBlobbersResponse);
            } else {
                reject("Not able to fetch file details from blobbers")
            }
        });
    },

    getFileMetaDataFromPathHash: async function (allocation_id, path_hash, auth_ticket, client_id) {
        const completeAllocationInfo = await this.allocationInfo(allocation_id);
        const blobber = completeAllocationInfo.blobbers[0].url;
        return new Promise(async function (resolve, reject) {
            const blobber_url = blobber + Endpoints.FILE_META_ENDPOINT + allocation_id;
            const response = await utils.postReqToBlobber(blobber_url, {}, { path_hash: path_hash, auth_token: atob(auth_ticket) }, client_id);
            if (response.status === 200) {
                const res = {
                    ...response.data,
                    blobbers: completeAllocationInfo.blobbers
                }
                resolve(res)
            } else {
                reject('Not able to fetch file details from blobbers')
            }
        });
    },

    commitMetaTransaction: async function (ae, crudType, allocation_id, path = '', auth_ticket = '', lookuphash = '', metadata = '') {
        if (metadata.length === 0) {
            if (path.length > 0) {
                metadata = await this.getFileMetaDataFromPath(allocation_id, path, ae.id)
            } else if (auth_ticket.length > 0) {
                const at = utils.parseAuthTicket(auth_ticket)
                metadata = await this.getFileMetaDataFromPathHash(at.allocation_id, lookuphash, auth_ticket, ae.id)
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
        const submitResponse = await submitTransaction(ae, '', 0, JSON.stringify(payload));
        const transactionData = JSON.parse(submitResponse.transaction_data)
        await this.updateMetaCommitToBlobbers(submitResponse.hash, allocation_id, transactionData.MetaData.LookupHash, ae.id, auth_ticket);
        return submitResponse
    },

    updateMetaCommitToBlobbers: async function (transaction_hash, allocation, lookup_hash, client_id, auth_ticket = "") {
        const completeAllocationInfo = await this.allocationInfo(allocation);
        blobber_list = completeAllocationInfo.blobbers.map(blobber => {
            return blobber.url
        });

        return new Promise(async (resolve, reject) => {
            for (let blobber of blobber_list) {
                try {
                    blobber_url = blobber + Endpoints.COMMIT_META_TXN_ENDPOINT + allocation;
                    const formData = new FormData();
                    formData.append('path_hash', lookup_hash);
                    formData.append('txn_id', transaction_hash);
                    if (auth_ticket) {
                        formData.append("auth_token", atob(auth_ticket));
                    }
                    await utils.postReqToBlobber(blobber_url, formData, {}, client_id);
                }
                catch (error) {
                    reject(error)
                }
            }
            resolve()
        })
    },

    uploadObject: async function (file, allocation_id, path, encrypt = false, client_json, option = null) {
        const url = proxyServerUrl + Endpoints.PROXY_SERVER_UPLOAD_ENDPOINT
        const formData = new FormData();
        formData.append('file', file);
        formData.append('allocation', allocation_id);
        formData.append('remote_path', path);
        formData.append('client_json', JSON.stringify(client_json))
        formData.append('encrypt', encrypt)
        const response = await utils.postReq(url, formData, option);
        return response
    },

    downloadObject: async function (allocation_id, path, client_json) {
        const url = proxyServerUrl + Endpoints.PROXY_SERVER_DOWNLOAD_ENDPOINT
        const params = {
            allocation: allocation_id,
            remote_path: path,
            client_json: client_json
        }
        const response = await utils.getDownloadReq(url, params);
        window.location.href = response.request.responseURL
        return response;
    },

    downloadSharedObject: async function (allocation_id, auth_ticket, lookup_hash, file_name, client_json) {
        const url = proxyServerUrl + Endpoints.PROXY_SERVER_DOWNLOAD_ENDPOINT
        const params = {
            allocation: allocation_id,
            auth_ticket: auth_ticket,
            lookup_hash: lookup_hash,
            file_name: file_name,
            client_json: client_json
        }
        const response = await utils.getDownloadReq(url, params);
        window.location.href = response.request.responseURL
    },

    renameObject: async function (allocation_id, path, new_name, client_json) {
        const url = proxyServerUrl + Endpoints.PROXY_SERVER_RENAME_ENDPOINT
        const formData = new FormData();
        formData.append('allocation', allocation_id);
        formData.append('remote_path', path);
        formData.append('new_name', new_name);
        formData.append('client_json', JSON.stringify(client_json));
        const response = await utils.putReq(url, formData);
        return response
    },

    deleteObject: async function (allocation_id, path, client_json) {
        const url = proxyServerUrl + Endpoints.PROXY_SERVER_DELETE_ENDPOINT
        const formData = new FormData();
        formData.append('allocation', allocation_id);
        formData.append('remote_path', path);
        formData.append('client_json', JSON.stringify(client_json));
        const response = await utils.delReq(url, formData);
        return response
    },

    copyObject: async function (allocation_id, path, dest, client_json) {
        const url = proxyServerUrl + Endpoints.PROXY_SERVER_COPY_ENDPOINT
        const formData = new FormData();
        formData.append('allocation', allocation_id);
        formData.append('remote_path', path);
        formData.append('dest_path', dest);
        formData.append('client_json', JSON.stringify(client_json));
        const response = await utils.putReq(url, formData);
        return response
    },

    shareObject: async function (allocation_id, path, client_id, public_encryption_key, client_json) {
        const url = proxyServerUrl + Endpoints.PROXY_SERVER_SHARE_ENDPOINT
        const params = {
            allocation: allocation_id,
            remote_path: path,
            referee_client_id: client_id,
            encryption_public_key: public_encryption_key,
            client_json: client_json
        }
        const response = await utils.getReq(url, params);
        return response
    },

    encryptPublicKey: async function (client_json) {
        const url = proxyServerUrl + Endpoints.PROXY_SERVER_ENCRYPT_PUBLIC_KEY_ENDPOINT
        const params = {
            client_json: client_json
        }
        const response = await utils.getReq(url, params);
        return response
    },

    moveObject: async function (allocation_id, path, dest, client_json) {
        const url = proxyServerUrl + Endpoints.PROXY_SERVER_MOVE_ENDPOINT
        const formData = new FormData();
        formData.append('allocation', allocation_id);
        formData.append('remote_path', path);
        formData.append('dest_path', dest);
        formData.append('client_json', JSON.stringify(client_json));
        const response = await utils.putReq(url, formData);
        return response
    },

    recoverWalletFromCloud: async function (AppIDToken, AppPhoneNumber) {
        const url = zeroBoxUrl + Endpoints.ZEROBOX_SERVER_GET_MNEMONIC_ENDPOINT;
        const response = await utils.recoverWalletFromCloud(url, AppIDToken, AppPhoneNumber);
        return response
    },

    saveWalletToCloud: async function (activeWallet, encryptMnemonicUsingPasscode, tokenId, phone) {
        const url = zeroBoxUrl + Endpoints.ZEROBOX_SERVER_SAVE_MNEMONIC_ENDPOINT;
        const data = new FormData();
        data.append('mnemonic', encryptMnemonicUsingPasscode);
        data.append('id_token', tokenId);
        data.append('phone_num', phone);
        data.append('app_id', "0x00");
        const response = await utils.postMethodTo0box(url, data, activeWallet.id, activeWallet.public_key);
        return response
    },

    createFree2GbAllocation: async function (id_token, phone_num,encryption_key,username,client_id,client_key){
        const url = zeroBoxUrl + Endpoints.ZEROBOX_SERVER_FREE_ALLOCATION;
        const data = new FormData();
        data.append('id_token', id_token);
        data.append('phone_num', phone_num);
        data.append('encryption_key',encryption_key);
        data.append('username', username);
        const response= await utils.postMethodTo0box(url, data,client_id, client_key);
        return response;
    },

    deleteExistAllocation: async function (id_token, phone_num,client_id,client_key){
        const url = zeroBoxUrl + Endpoints.ZEROBOX_SERVER_DELETE_EXIST_ALLOCATION;
        const data = new FormData();
        data.append('id_token', id_token);
        data.append('phone_num', phone_num);
        const reponse = await utils.deleteMethodTo0box(url,data, client_id,client_key);
        return reponse;
    },

    postShareInfo: async function (authTicket, activeWallet, message, fromInfo, receiver_id, ae) {
        const url = zeroBoxUrl + Endpoints.ZEROBOX_SERVER_SHARE_INFO_ENDPOINT;
        const client_signature = this.getSign(ae.id, ae.secretKey);
        const data = new FormData();
        data.append('auth_tickets', JSON.stringify(authTicket));
        data.append('message', message);
        data.append('from_info', fromInfo);
        data.append('reciever_client_id', receiver_id);
        data.append('client_signature', client_signature);
        const response = await utils.postMethodTo0box(url, data, ae.id, ae.client_key);
        return response
    },

    deleteSharedObject: async function (authTicket, activeWallet) {
        const url = zeroBoxUrl + Endpoints.ZEROBOX_SERVER_SHARE_INFO_ENDPOINT;
        const sig = this.getSign(activeWallet.id, activeWallet.secretKey);
        const data = new FormData();
        data.append('client_signature', sig);
        data.append('auth_ticket', authTicket)
        const response = await utils.deleteMethodTo0box(url, data, activeWallet.id, activeWallet.client_key);
        return response
    },

    getSign: function (client_id, secretKey) {
        const bytehash = utils.hexStringToByte(client_id);
        const sec = new bls.SecretKey();
        sec.deserializeHexStr(secretKey);
        const sig = sec.sign(bytehash);
        return sig.serializeToHexStr();
    },

    getShareInfo: async function (activeWallet) {
        const url = zeroBoxUrl + Endpoints.ZEROBOX_SERVER_SHARE_INFO_ENDPOINT;
        const clientSignature = this.getSign(activeWallet.id, activeWallet.secretKey);
        const response = await utils.getShareInfo(url, clientSignature, activeWallet.id, activeWallet.client_key);
        return response
    },

    getReferralsInfo: async function (activeWallet) {
        const url = zeroBoxUrl + Endpoints.ZEROBOX_SERVER_REFERRALS_INFO_ENDPOINT;
        // const clientSignature = this.getSign(activeWallet.id, activeWallet.secretKey);
        const response = await utils.getReferrals(url);
        return response
    },

    executeFaucetSmartContract: function (ae, methodName, input, transactionValue) {
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

    const { client_id, public_key, private_key } = createWalletKeys(mnemonic)
    var data = {};
    data.public_key = public_key;
    data.id = client_id;

    return new Promise(function (resolve, reject) {
        utils.doParallelPostReqToAllMiners(miners, Endpoints.REGISTER_CLIENT, data)
            .then((response) => {
                const myaccount = response;
                if (myaccount.entity === undefined) {
                    myaccount.entity = {
                        id: client_id,
                        public_key: public_key,
                        version: response.version,
                        creation_date: response.creation_date,
                        secretKey: private_key,
                        mnemonic: mnemonic
                    };
                } else {
                    myaccount.entity.secretKey = private_key;
                    myaccount.entity.mnemonic = mnemonic;
                }
                var ae = new models.Wallet(myaccount.entity);
                resolve(ae);
            })
            .catch((error) => {
                reject(error);
            })
    });
}

function createWalletKeys(mnemonic) {

    const seed = bip39.mnemonicToSeed(mnemonic, "0chain-client-split-key");
    const buffer = new Uint8Array(seed)
    const blsSecret = new bls.SecretKey();
    bls.setRandFunc(buffer)
    blsSecret.setLittleEndian(buffer)
    const public_key = blsSecret.getPublicKey().serializeToHexStr();
    const private_key = blsSecret.serializeToHexStr();
    const client_id = sha3.sha3_256(utils.hexStringToByte(public_key));

    return {
        client_id,
        public_key,
        private_key
    }

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
    data.transaction_fee = 0;
    data.signature = sig.serializeToHexStr();
    data.version = '1.0'
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

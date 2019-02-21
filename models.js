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

"use strict";


module.exports = {

    ChainStats: function ChainStats(data) {

        this.block_size = data.block_size;
        this.count = data.count;
        this.current_round = data.current_round;
        this.delta = data.delta;
        this.max = data.max;
        this.mean = data.mean;
        this.min = data.min;
        this.percentile_50 = data.percentile_50;
        this.percentile_90 = data.percentile_90;
        this.percentile_95 = data.percentile_95;
        this.percentile_99 = data.percentile_99;
        this.rate_15_min = data.rate_15_min;
        this.rate_1_min = data.rate_1_min;
        this.rate_5_min = data.rate_5_min;
        this.rate_mean = data.rate_mean;
        this.std_dev = data.std_dev;
    },

    BlockSummary: function BlockSummary(data) {
        this.version = data.version;
        this.creation_date = data.creation_date;
        this.hash = data.hash;
        this.round = data.round;
        this.round_random_seed = data.round_random_seed;
        this.merkle_tree_root = data.merkle_tree_root;
        this.state_hash = data.state_hash;
        this.receipt_merkle_tree_root = data.receipt_merkle_tree_root;
    },

    Block: function Block(data) {

        this.version = data.version;
        this.creation_date = data.creation_date;
        this.magic_block_hash = data.magic_block_hash;
        this.prev_hash = data.prev_hash;
        this.miner_id = data.miner_id;
        this.round = data.round;
        this.round_random_seed = data.round_random_seed;
        this.state_hash = data.state_hash;
        this.hash = data.hash;
        this.signature = data.signature;
        this.chain_id = data.chain_id;
        this.chain_weight = data.chain_weight;

        var pvts = [];

        for (let vt of data.prev_verification_tickets) {
            pvts.push(new module.exports.VerificationTicket(vt));
        }

        this.prev_verification_tickets = pvts;

        var txs = [];
        for (let t of data.transactions) {
            txs.push(new module.exports.Transaction(t));
        }

        this.transactions = txs;

        var vts = [];
        for (let vt of data.verification_tickets) {
            vts.push(new module.exports.VerificationTicket(vt));
        }

        this.verification_tickets = vts;

    },

    Wallet: function Wallet(data) {
        this.id = data.id;
        this.version = data.version;
        this.creation_date = data.creation_date;
        this.public_key = data.public_key;
        this.secretKey = data.secretKey;
        this.mnemonic = data.mnemonic;
    },

    Transaction: function Transaction(data) {
        this.hash = data.hash;
        this.version = data.version;
        this.client_id = data.client_id;
        this.to_client_id = (typeof data.to_client_id != 'undefined') ? data.to_client_id : null;
        this.chain_id = data.chain_id;
        this.transaction_data = data.transaction_data;
        this.transaction_value = data.transaction_value;
        this.signature = data.signature;
        this.creation_date = data.creation_date;
        this.transaction_type = data.transaction_type;
        this.transaction_output = data.transaction_output;
        this.txn_output_hash = (typeof data.txn_output_hash != 'undefined') ? data.txn_output_hash : null;
    },

    TransactionDetail: function TransactionDetail(data) {
        this.transaction = new module.exports.Transaction(data.txn);
        delete data.txn;
        this.confirmation = new module.exports.Confirmation(data);
    },

    Confirmation: function Confirmation(data) {
        this.version = data.version;
        this.hash = data.hash;
        this.block_hash = data.block_hash;
        this.creation_date = data.creation_date;
        this.round = data.round;
        this.round_random_seed = data.round_random_seed;
        this.merkle_tree_root = data.merkle_tree_root;
        this.merkle_tree_path = new module.exports.merkle_tree_path(data.merkle_tree_path);
    },

    merkle_tree_path: function merkle_tree_path(data) {
        this.nodes = data.nodes;
        this.leaf_index = data.leaf_index;
    },

    VerificationTicket: function VerificationTicket(data) {
        this.verifier_id = data.verifier_id;
        this.signature = data.signature;
    }
}

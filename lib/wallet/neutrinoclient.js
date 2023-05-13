'use strict';

const assert = require('bsert');
const Chain = require('../blockchain/chain');
const Pool = require('../net/pool');
const Wallet = require('../wallet/wallet');

class Neutrino extends Wallet {
    constructor(options) {
        super('bcoin', 'bcoin.conf', 'debug.log', options);

        this.opened = false;

        this.neutrino = true;

        this.init();
    }

    init() {
        
    }
}
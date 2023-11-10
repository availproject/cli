#!/usr/bin/env node
'use strict';
import { Command, Option } from 'commander'
import { initialize, formatNumberToBalance, getKeyringFromSeed, isValidAddress } from 'avail-js-sdk'
import { spawn } from 'child_process'
const program = new Command()

enum NetworkNames {
  Kate = 'kate',
  Goldberg = 'goldberg',
  Local = 'local'
}

const NETWORK_RPC_URLS: { kate: string, goldberg: string, local: string } = {
  kate: 'wss://kate.avail.tools/ws',
  goldberg: 'wss://goldberg.avail.tools/ws',
  local: 'wss://127.0.0.1:9944/ws'
}

program
  .name('avail-cli')
  .description('A simple CLI for Avail network utilities')
  .version('0.1.0')

const transfer = async (options: {
  seed: string
  network: NetworkNames
  rpc: string
  to: string
  value: number
}): Promise<void> => {
  try {
    const seed = options.seed
    const recipient = options.to

    if (!isValidAddress(recipient)) throw new Error(recipient + ' recipient address is invalid')

    let rpcUrl: string
    if (typeof (NETWORK_RPC_URLS[options.network]) === 'undefined') {
      rpcUrl = options.rpc
    } else {
      rpcUrl = NETWORK_RPC_URLS[options.network]
    }

    const tempConsoleWarn = console.warn
    console.warn = () => {}
    const api = await initialize(rpcUrl, { noInitWarn: true })
    console.warn = tempConsoleWarn
    const keyring = getKeyringFromSeed(seed)
    const amount = formatNumberToBalance(options.value)

    await api.tx.balances.transfer(recipient, amount).signAndSend(keyring, { nonce: -1 })
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

const lc = async (options: {
  network: NetworkNames, config: string
}): Promise<void> => {
  try {
    let cmd = `curl -sL1 avail.sh | sh -s -- --network ${options.network}`
    if (typeof(options.config) !== 'undefined') {
      cmd = cmd.concat(` --config ${options.config}`)
    }
    const child: any = spawn(cmd, { cwd: process.cwd(), shell: true, stdio: 'inherit' })
    child.on('close', (code: number) => {
      process.exit(code)
    })
    child.on('exit', (code: number) => {
      process.exit(code)
    })
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

program
  .command('transfer')
  .addOption(new Option('-n, --network <network name>', 'network name').choices(['kate', 'goldberg', 'local']).default('goldberg').conflicts('rpc'))
  .addOption(new Option('-r, --rpc <RPC url>', 'the RPC url to connect to').env('AVAIL_RPC_URL').default(NETWORK_RPC_URLS.goldberg))
  .addOption(new Option('-s, --seed <seed phrase>', 'the seed phrase for the Avail account').env('AVAIL_SEED').makeOptionMandatory())
  .requiredOption('--to <recipient address>', 'the recipient address')
  .requiredOption('--value <amount in AVL>', 'the value in AVL (10e18) to transfer')
  .action(transfer)

program
  .command('lc')
  .addOption(new Option('-n, --network <network name>', 'network name').choices(['kate', 'goldberg', 'local']).default('goldberg').makeOptionMandatory())
  .option('-c, --config <path to config file>', 'the config file to use')
  .action(lc)

program.parse()

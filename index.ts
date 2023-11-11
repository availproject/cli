#!/usr/bin/env node
'use strict'
import { Argument, Command, Option } from 'commander'
import { initialize, formatNumberToBalance, getKeyringFromSeed, isValidAddress } from 'avail-js-sdk'
import { spawn } from 'child_process'
import { version } from './package.json'
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
  .version(version)

const transfer = async (to: string, value: number, options: {
  seed: string
  network: NetworkNames
  rpc: string
  to: string
  value: number
}): Promise<void> => {
  try {
    if (!isValidAddress(to)) throw new Error(to + ' recipient address is invalid')
    const seed = options.seed

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
    const amount = formatNumberToBalance(value)

    await api.tx.balances.transfer(to, amount).signAndSend(keyring, { nonce: -1 })
    console.log(`✅ ${value} AVL successfully sent to ${to}`)
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

const data = async (blob: string, options: {
  seed: string
  network: NetworkNames
  rpc: string
  appId: number
}): Promise<void> => {
  try {
    const seed = options.seed

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

    await api.tx.dataAvailability.submitData(blob).signAndSend(keyring, { app_id: options.appId, nonce: -1 } as any)
    console.log('✅ Data blob sent to Avail')
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

const lc = async (options: {
  network: NetworkNames
  config: string
}): Promise<void> => {
  try {
    let cmd = `curl -sL1 avail.sh | sh -s -- --network ${options.network}`
    if (typeof (options.config) !== 'undefined') {
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
  .command('transfer').description('Transfer AVL token to another account')
  .addOption(new Option('-n, --network <network name>', 'network name').choices(['kate', 'goldberg', 'local']).default('goldberg').conflicts('rpc'))
  .addOption(new Option('-r, --rpc <RPC url>', 'the RPC url to connect to').env('AVAIL_RPC_URL').default(NETWORK_RPC_URLS.goldberg))
  .addOption(new Option('-s, --seed <seed phrase>', 'the seed phrase for the Avail account').env('AVAIL_SEED').makeOptionMandatory())
  .argument('<to>', 'the recipient address')
  .argument('<value>', 'the amount of AVL (10e18 units) to transfer')
  .action(transfer)

program
  .command('data').description('Utilities to operate with data on Avail network')
  .command('submit').description('Submit a data blob to an Avail network')
  .addOption(new Option('-n, --network <network name>', 'network name').choices(['kate', 'goldberg', 'local']).default('goldberg').conflicts('rpc'))
  .addOption(new Option('-r, --rpc <RPC url>', 'the RPC url to connect to').env('AVAIL_RPC_URL').default(NETWORK_RPC_URLS.goldberg))
  .addOption(new Option('-s, --seed <seed phrase>', 'the seed phrase for the Avail account').env('AVAIL_SEED').makeOptionMandatory())
  .addOption(new Option('-a, --app-id <app ID>', 'the blob will be submitted with this app ID').default(0))
  .addArgument(new Argument('<blob>', 'the data blob to submit'))
  .action(data)

program
  .command('lc').description('Utilities to operate an Avail light client')
  .command('up').description('Spawns a new Avail light client or runs an existing one')
  .addOption(new Option('-n, --network <network name>', 'network name').choices(['kate', 'goldberg', 'local']).default('goldberg').makeOptionMandatory())
  .option('-c, --config <path to config file>', 'the config file to use')
  .action(lc)

program.parse()

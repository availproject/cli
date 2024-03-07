#!/usr/bin/env node
'use strict'
import { Argument, Command, Option } from 'commander'
import { initialize, formatNumberToBalance, getKeyringFromSeed, isValidAddress } from 'avail-js-sdk'
import { ISubmittableResult } from '@polkadot/types/types'
import { KeyringPair } from '@polkadot/keyring/types'
import { BN } from '@polkadot/util'
import { spawn } from 'child_process'
import { access, mkdir, writeFile, chmod } from 'node:fs/promises'
const program = new Command()

enum NetworkNames {
  Kate = 'kate',
  Goldberg = 'goldberg',
  Local = 'local'
}

enum Wait {
  Yes = 'yes',
  No = 'no',
  Final = 'final'
}

const NETWORK_RPC_URLS: { kate: string, goldberg: string, local: string } = {
  kate: 'wss://kate.avail.tools/ws',
  goldberg: 'wss://goldberg.avail.tools/ws',
  local: 'wss://127.0.0.1:9944/ws'
}

program
  .name('avail')
  .description('A simple CLI for Avail network utilities')
  .version('0.1.12')

const sendTransferTx = async (api: any, to: string, amount: BN, keyring: KeyringPair, opt: Partial<any>, network: NetworkNames, wait: Wait): Promise<void> => {
  return await new Promise((resolve, reject) => {
    api.tx.balances.transfer(to, amount)
      .signAndSend(keyring, opt, (result: ISubmittableResult) => {
        if (wait === Wait.Yes && result.status.isInBlock) {
          console.log(`✅ Transfer included at block hash: ${String(result.status.asInBlock)}`)
          if (typeof (network) !== 'undefined') {
            console.log(`🧭 Link to explorer: https://${network as string}.avail.tools/#/explorer/query/${String(result.status.asInBlock)}`)
          }
          resolve()
        } else if (wait === Wait.Final && result.status.isFinalized) {
          console.log(`✅ Transfer finalized at block hash: ${String(result.status.asFinalized)}`)
          if (typeof (network) !== 'undefined') {
            console.log(`🧭 Link to explorer: https://${network as string}.avail.tools/#/explorer/query/${String(result.status.asFinalized)}`)
          }
          resolve()
        }
      })
      .catch((error: string) => {
        reject(new Error('❌ Transaction failed: ' + error))
      })
  })
}

const transfer = async (to: string, value: number, options: {
  seed: string
  network: NetworkNames
  rpc: string
  wait: Wait
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
    console.warn = () => { }
    const api = await initialize(rpcUrl, { noInitWarn: true })
    console.warn = tempConsoleWarn
    const keyring = getKeyringFromSeed(seed)
    const amount = formatNumberToBalance(value);
    const opt: Partial<any> = { nonce: -1 }
    if (options.wait !== Wait.No) {
      await sendTransferTx(api, to, amount, keyring, opt, options.network, options.wait)
    } else {
      await api.tx.balances.transfer(to, amount).signAndSend(keyring, opt)
    }
    console.log(`✅ ${value} AVL successfully sent to ${to}`)
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

const sendBlobTx = async (api: any, blob: string, keyring: KeyringPair, opt: Partial<any>, network: NetworkNames, wait: Wait): Promise<void> => {
  return await new Promise((resolve, reject) => {
    api.tx.dataAvailability.submitData(blob)
      .signAndSend(keyring, opt, (result: ISubmittableResult) => {
        if (wait === Wait.Yes && result.status.isInBlock) {
          console.log(`✅ Blob included at block hash: ${String(result.status.asInBlock)}`)
          if (typeof (network) !== 'undefined') {
            console.log(`🧭 Link to explorer: https://${network as string}.avail.tools/#/explorer/query/${String(result.status.asInBlock)}`)
          }
          resolve()
        } else if (wait === Wait.Final && result.status.isFinalized) {
          console.log(`✅ Blob finalized at block hash: ${String(result.status.asFinalized)}`)
          if (typeof (network) !== 'undefined') {
            console.log(`🧭 Link to explorer: https://${network as string}.avail.tools/#/explorer/query/${String(result.status.asFinalized)}`)
          }
          resolve()
        }
      })
      .catch((error: string) => {
        reject(new Error('❌ Transaction failed: ' + error))
      })
  })
}

async function data(blob: string, options: {
  seed: string
  network: NetworkNames
  rpc: string
  appId: number
  wait: Wait
}): Promise<void> {
  try {
    const seed = options.seed
    let rpcUrl: string
    if (typeof (NETWORK_RPC_URLS[options.network]) === 'undefined') {
      rpcUrl = options.rpc
    } else {
      rpcUrl = NETWORK_RPC_URLS[options.network]
    }

    const tempConsoleWarn = console.warn
    console.warn = () => { }
    const api = await initialize(rpcUrl, { noInitWarn: true })
    console.warn = tempConsoleWarn
    const keyring = getKeyringFromSeed(seed)
    const opt: Partial<any> = { app_id: options.appId, nonce: -1 }
    if (options.wait !== Wait.No) {
      await sendBlobTx(api, blob, keyring, opt, options.network, options.wait)
    } else {
      await api.tx.dataAvailability.submitData(blob).signAndSend(keyring, opt)
    }
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
  identity: string,
  upgrade: boolean,
}): Promise<void> => {
  try {
    let cmd = `curl -sL1 avail.sh | sh -s --`
    if (typeof (options.config) !== 'undefined') {
      cmd = cmd.concat(` --config ${options.config}`)
    } else {
      cmd = cmd.concat(` --network ${options.network}`)
    }
    if (typeof (options.identity) !== 'undefined') {
      cmd = cmd.concat(` --identity ${options.identity}`)
    }
    if (options.upgrade) {
      cmd = cmd.concat(` --upgrade y`)
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

const setId = async (seed: string): Promise<void> => {
  try {
    try {
      await access("path");
    } catch (error) {
      mkdir(`${process.env.HOME as string}/.availup`)
    }
    await writeFile(`${process.env.HOME as string}/.availup/identity.toml`, `avail_secret_seed_phrase = '${seed}'`)
    await chmod(`${process.env.HOME as string}/.availup/identity.toml`, 0o700)
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
  .addOption(new Option('-w, --wait <status>', 'wait for extrinsic inclusion').choices(['yes', 'no', 'final']).default('yes'))
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
  .addOption(new Option('-w, --wait <status>', 'wait for extrinsic inclusion').choices(['yes', 'no', 'final']).default('yes'))
  .addArgument(new Argument('<blob>', 'the data blob to submit'))
  .action(data)

program
  .command('lc').description('Utilities to operate an Avail light client')
  .command('up').description('Spawns a new Avail light client or runs an existing one')
  .addOption(new Option('-n, --network <network name>', 'network name').choices(['kate', 'goldberg', 'local']).default('goldberg').makeOptionMandatory())
  .option('-i, --identity <identity>', 'the identity to use')
  .option('-c, --config <path to config file>', 'the config file to use')
  .option('-u, --upgrade', 'upgrade the version of the light client')
  .action(lc)

program
  .command('set-id').description('Creates an identity file for the light client')
  .addArgument(new Argument('<seed>', 'the seed phrase for the avail account'))
  .action(setId)

program.parse()

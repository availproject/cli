import { Command, Option } from 'commander'
import { initialize, formatNumberToBalance, getKeyringFromSeed, isValidAddress } from 'avail-js-sdk'
const program = new Command()

enum NetworkNames {
  Kate = 'kate',
  Goldberg = 'goldberg',
}

const NETWORK_RPC_URLS: { kate: string, goldberg: string } = {
  kate: 'wss://kate.avail.tools/ws',
  goldberg: 'wss://goldberg.avail.tools/ws'
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

program
  .command('transfer')
  .addOption(new Option('-n --network <network name>', 'network name').choices(['kate', 'goldberg']).default('goldberg').conflicts('rpc'))
  .addOption(new Option('-r, --rpc <RPC url>', 'the RPC url to connect to').env('AVAIL_RPC_URL').default(NETWORK_RPC_URLS.goldberg))
  .addOption(new Option('-s, --seed <seed phrase>', 'the seed phrase for the Avail account').env('AVAIL_SEED').makeOptionMandatory())
  .requiredOption('--to <recipient address>', 'the recipient address')
  .requiredOption('--value <amount in AVL>', 'the value in AVL (10e18) to transfer')
  .action(transfer)

program.parse()

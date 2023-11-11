# Avail CLI

To install the CLI from `npm`, run the following command:
```sh
npm install -g @availproject/cli
```

To use the CLI, then run:
```sh
avail --help
```

## Commands
### `transfer`
You can use the `transfer` command to transfer on any Avail network:
```sh
export AVAIL_SEED=<your seed phrase>
avail transfer --network <network> --to <recipient> --value <amount>
# or you can pass it like:
AVAIL_SEED=<your seed phrase> avail transfer --network <network> --to <recipient> --value <amount>
```

### `lc`
You can use the `lc` command to spin up a light client on a network of your choice:
```sh
avail lc --network <network>
```

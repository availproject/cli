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
avail transfer --network <network> <to> <value>
# or you can pass it like:
AVAIL_SEED=<your seed phrase> avail transfer --network <network> <to> <value>
```

### `lc`
You can use the `lc` command to spin up a light client on a network of your choice:
```sh
avail lc up --network <network>
```

### `data`
You can use the `data` command to submit a data blob on a network of your choice:
```sh
avail data submit --network <network> <blob>
```

#!/usr/bin/env node
import { spawn } from "node:child_process";
import type { SignerOptions } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { BN } from "@polkadot/util";
import {
	type ApiPromise,
	formatNumberToBalance,
	getKeyringFromSeed,
	initialize,
	isValidAddress,
} from "avail-js-sdk";
import { Argument, Command, Option } from "commander";

enum NetworkNames {
	Mainnet = "mainnet",
	Turing = "turing",
	Local = "local",
}

enum Wait {
	Yes = "yes",
	No = "no",
	Final = "final",
}

const RPC_URLS: { mainnet: string; turing: string; local: string } = {
	mainnet: "wss://mainnet-rpc.avail.so/ws",
	turing: "wss://turing-rpc.avail.so/ws",
	local: "wss://127.0.0.1:9944/ws",
};

const EXPLORER_URLS: { mainnet: string; turing: string; local: string } = {
	mainnet:
		"https://explorer.availproject.org/?rpc=wss://mainnet-rpc.avail.so/ws&light=https://api.lightclient.mainnet.avail.so/v1",
	turing:
		"https://explorer.availproject.org/?rpc=wss://turing-rpc.avail.so/ws&light=https://api.lightclient.turing.avail.so/v1",
	local: "https://explorer.availproject.org/?rpc=wss://127.0.0.1:9944/ws",
};

const program = new Command();

program
	.name("avail")
	.description("A simple CLI for Avail network utilities")
	.version("0.1.15");

const sendTransferTx = async (
	api: ApiPromise,
	to: string,
	amount: BN,
	keyring: KeyringPair,
	opt: Partial<SignerOptions>,
	network: NetworkNames,
	wait: Wait,
): Promise<void> => {
	return await new Promise((resolve, reject) => {
		api.tx.balances
			.transfer(to, amount)
			.signAndSend(keyring, opt, (result) => {
				if (wait === Wait.Yes && result.status.isInBlock) {
					console.log(
						`✅ Transfer included at block hash: ${String(result.status.asInBlock)}`,
					);
					if (typeof network !== "undefined") {
						console.log(
							`🧭 Link to explorer: ${EXPLORER_URLS[network]}/#/explorer/query/${String(result.status.asInBlock)}`,
						);
					}
					resolve();
				} else if (wait === Wait.Final && result.status.isFinalized) {
					console.log(
						`✅ Transfer finalized at block hash: ${String(result.status.asFinalized)}`,
					);
					if (typeof network !== "undefined") {
						console.log(
							`🧭 Link to explorer: https://${EXPLORER_URLS[network]}/#/explorer/query/${String(result.status.asFinalized)}`,
						);
					}
					resolve();
				}
			})
			.catch((error: string) => {
				reject(new Error(`❌ Transaction failed: ${error}`));
			});
	});
};

const transfer = async (
	to: string,
	value: number,
	options: {
		seed: string;
		network: NetworkNames;
		rpc: string;
		wait: Wait;
	},
): Promise<void> => {
	try {
		if (!isValidAddress(to))
			throw new Error(`${to} recipient address is invalid`);
		const seed = options.seed;

		let rpcUrl: string;
		if (typeof RPC_URLS[options.network] === "undefined") {
			rpcUrl = options.rpc;
		} else {
			rpcUrl = RPC_URLS[options.network];
		}

		const tempConsoleWarn = console.warn;
		console.warn = () => {};
		const api: ApiPromise = await initialize(rpcUrl, { noInitWarn: true });
		console.warn = tempConsoleWarn;
		const keyring = getKeyringFromSeed(seed);
		const amount = formatNumberToBalance(value);
		const opt: Partial<{ nonce: number }> = { nonce: -1 };
		if (options.wait !== Wait.No) {
			await sendTransferTx(
				api,
				to,
				amount,
				keyring,
				opt,
				options.network,
				options.wait,
			);
		} else {
			await api.tx.balances.transfer(to, amount).signAndSend(keyring, opt);
		}
		console.log(`✅ ${value} AVL successfully sent to ${to}`);
		process.exit(0);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
};

const sendBlobTx = async (
	api: ApiPromise,
	blob: string,
	keyring: KeyringPair,
	opt: Partial<SignerOptions>,
	network: NetworkNames,
	wait: Wait,
): Promise<void> => {
	return await new Promise((resolve, reject) => {
		api.tx.dataAvailability
			.submitData(blob)
			.signAndSend(keyring, opt, (result) => {
				if (wait === Wait.Yes && result.status.isInBlock) {
					console.log(
						`✅ Blob included at block hash: ${String(result.status.asInBlock)}`,
					);
					if (typeof network !== "undefined") {
						console.log(
							`🧭 Link to explorer: https://${network as string}.avail.tools/#/explorer/query/${String(result.status.asInBlock)}`,
						);
					}
					resolve();
				} else if (wait === Wait.Final && result.status.isFinalized) {
					console.log(
						`✅ Blob finalized at block hash: ${String(result.status.asFinalized)}`,
					);
					if (typeof network !== "undefined") {
						console.log(
							`🧭 Link to explorer: https://${network as string}.avail.tools/#/explorer/query/${String(result.status.asFinalized)}`,
						);
					}
					resolve();
				}
			})
			.catch((error: string) => {
				reject(new Error(`❌ Transaction failed: ${error}`));
			});
	});
};

async function data(
	blob: string,
	options: {
		seed: string;
		network: NetworkNames;
		rpc: string;
		appId: number;
		wait: Wait;
	},
): Promise<void> {
	try {
		const seed = options.seed;
		let rpcUrl: string;
		if (typeof RPC_URLS[options.network] === "undefined") {
			rpcUrl = options.rpc;
		} else {
			rpcUrl = RPC_URLS[options.network];
		}

		const tempConsoleWarn = console.warn;
		console.warn = () => {};
		const api = await initialize(rpcUrl, { noInitWarn: true });
		console.warn = tempConsoleWarn;
		const keyring = getKeyringFromSeed(seed);
		const opt: Partial<{ app_id: number; nonce: number }> = {
			app_id: options.appId,
			nonce: -1,
		};
		if (options.wait !== Wait.No) {
			await sendBlobTx(api, blob, keyring, opt, options.network, options.wait);
		} else {
			await api.tx.dataAvailability.submitData(blob).signAndSend(keyring, opt);
		}
		console.log("✅ Data blob sent to Avail");
		process.exit(0);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
}

const lc = async (options: {
	network: NetworkNames;
	config: string;
	identity: string;
	noUpgrade: boolean;
}): Promise<void> => {
	try {
		let cmd = "curl -sL1 avail.sh | bash -s --";
		if (typeof options.config !== "undefined") {
			cmd = cmd.concat(` --config ${options.config}`);
		} else {
			cmd = cmd.concat(` --network ${options.network}`);
		}
		if (typeof options.identity !== "undefined") {
			cmd = cmd.concat(` --identity ${options.identity}`);
		}
		if (!options.noUpgrade) {
			cmd = cmd.concat(" --upgrade y");
		}
		const child = spawn(cmd, {
			cwd: process.cwd(),
			shell: true,
			stdio: "inherit",
		});
		child.on("close", (code: number) => {
			process.exit(code);
		});
		child.on("exit", (code: number) => {
			process.exit(code);
		});
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
};

program
	.command("transfer")
	.description("Transfer AVL token to another account")
	.addOption(
		new Option("-n, --network <network name>", "network name")
			.choices(["mainnet", "turing", "local"])
			.default("turing")
			.conflicts("rpc"),
	)
	.addOption(
		new Option("-r, --rpc <RPC url>", "the RPC url to connect to")
			.env("AVAIL_RPC_URL")
			.default(RPC_URLS.turing),
	)
	.addOption(
		new Option(
			"-s, --seed <seed phrase>",
			"the seed phrase for the Avail account",
		)
			.env("AVAIL_SEED")
			.makeOptionMandatory(),
	)
	.addOption(
		new Option("-w, --wait <status>", "wait for extrinsic inclusion")
			.choices(["yes", "no", "final"])
			.default("yes"),
	)
	.argument("<to>", "the recipient address")
	.argument("<value>", "the amount of AVL (10e18 units) to transfer")
	.action(transfer);

program
	.command("data")
	.description("Utilities to operate with data on Avail network")
	.command("submit")
	.description("Submit a data blob to an Avail network")
	.addOption(
		new Option("-n, --network <network name>", "network name")
			.choices(["mainnet", "turing", "local"])
			.default("turing")
			.conflicts("rpc"),
	)
	.addOption(
		new Option("-r, --rpc <RPC url>", "the RPC url to connect to")
			.env("AVAIL_RPC_URL")
			.default(RPC_URLS.turing),
	)
	.addOption(
		new Option(
			"-s, --seed <seed phrase>",
			"the seed phrase for the Avail account",
		)
			.env("AVAIL_SEED")
			.makeOptionMandatory(),
	)
	.addOption(
		new Option(
			"-a, --app-id <app ID>",
			"the blob will be submitted with this app ID",
		).default(0),
	)
	.addOption(
		new Option("-w, --wait <status>", "wait for extrinsic inclusion")
			.choices(["yes", "no", "final"])
			.default("yes"),
	)
	.addArgument(new Argument("<blob>", "the data blob to submit"))
	.action(data);

program
	.command("lc")
	.description("Utilities to operate an Avail light client")
	.command("up")
	.description("Spawns a new Avail light client or runs an existing one")
	.addOption(
		new Option("-n, --network <network name>", "network name")
			.choices(["mainnet", "turing", "local"])
			.default("turing")
			.makeOptionMandatory(),
	)
	.option("-i, --identity <identity>", "the identity to use")
	.option("-c, --config <path to config file>", "the config file to use")
	.option("-nu, --no-upgrade", "do not upgrade the version of the light client")
	.action(lc);

program.parse();

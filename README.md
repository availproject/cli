# Avail CLI

To install the CLI from `npm`, run the following command:
```sh
npm i -g @availproject/cli
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

## Contribution Guidelines

### Rules

Avail welcomes contributors from every background and skill level. Our mission is to build a community that's not only welcoming and friendly but also aligned with the best development practices. Interested in contributing to this project? Whether you've spotted an issue, have improvement ideas, or want to add new features, we'd love to have your input. Simply open a GitHub issue or submit a pull request to get started.

1. Before asking any questions regarding how the project works, please read through all the documentation and install the project on your own local machine to try it and understand how it works. Please ask your questions in open channels (Github and [Telegram](https://t.me/avail_uncharted/14)).

2. To work on an issue, first, get approval from a maintainer or team member. You can request to be assigned by commenting on the issue in GitHub. This respects the efforts of others who may already be working on the same issue. Unapproved PRs may be declined.

3. When assigned to an issue, it's expected that you're ready to actively work on it. After assignment, please provide a draft PR or update within one week. If you encounter delays, communicate with us to maintain your assignment.

4. Got an idea or found a bug? Open an issue with the tags [New Feature] or [Bug]. Provide detailed information like reproduction steps (for bugs) or a basic feature proposal. The team will review and potentially assign you to it.

5. Start a draft PR early in your development process, even with incomplete changes. This allows us to track progress, provide timely reviews, and assist you. Expect feedback on your drafts periodically.

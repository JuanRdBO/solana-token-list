import * as fs from "fs";

import {
	_coinsUrl,
	_mainnetChainId,
	_solanaTokensPath,
	_stellarTokensPath,
	_stablecoinsUrl,
	_tokenListUrl,
} from "./constants";
import { CoinMap, Json } from "./types";
import {
	CoingeckoCoinsSchema,
	CoingeckoStablecoinsSchema,
	CoingeckoStablecoinSchema,
	CoingeckoTokenListSchema,
	CoingeckoTokenListSchemaToken,
	CoingeckoCoinSchema,
} from "./schema";
import { create } from "superstruct";
import axios from "axios";
import { fetchOldTokens } from "../tokenRegistry/tokenList";
import config from "../config";
import { fetchSolanaJupiterTokensParsed } from "./fetchJupiterTokens";

async function fetchSolanaTokensAndWriteToFile() {
	// get the coingecko token Public keys and their coingecko ids.
	const coins = await fetchCoingeckoCoins();
	// get the coingecko tokens from the tokenlist and match them with the coingecko ids.
	const coingecko = await matchTokens(coins);
	// filter out unwanted tokens
	const filteredTokens = filterUndesiredTokens(coingecko);

	// fetch Jupiter tokens
	const jupCoins = await fetchSolanaJupiterTokensParsed();
	// match the Jupiter tokens with the old tokens. We prefer Jupiter tokens over old tokens.
	const jupTokens = matchJupiterAndRest({
		jupTokens: jupCoins,
		restTokens: filteredTokens,
	});

	// filter the tokens for chainId 101
	const solanaTokens = jupTokens.tokens.filter(
		(token) => token.chainId === 101 || token.chainId === 103,
	);
	jupTokens.tokens = solanaTokens;

	// Loop through all the tokens and replace "USD Coin" with "USDC on Solana"
	jupTokens.tokens.forEach((token) => {
		if (token.address === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") {
			token.name = "USDC on Solana";
		}
	});

	// write the coingecko tokens to the tokenlist file.
	await writeToFile(jupTokens);
}

function matchJupiterAndRest({
	jupTokens,
	restTokens,
}: {
	jupTokens: CoingeckoTokenListSchemaToken[];
	restTokens: CoingeckoTokenListSchema;
}): CoingeckoTokenListSchema {
	// console.log('jupTokens: ', jupTokens.slice(0, 10));
	// console.log('restTokens: ', {
	//   ...restTokens,
	//   tokens: restTokens.tokens.slice(0, 10),
	// });

	const merged = new Map<string, CoingeckoTokenListSchemaToken>();

	// First add all items from the primary list to the map
	jupTokens.forEach((item) => merged.set(item?.address ?? "", item));

	// Then add all items from the secondary list, overwriting duplicates from the primary list
	restTokens.tokens.forEach((item) => merged.set(item?.address ?? "", item));

	return { ...restTokens, tokens: Array.from(merged.values()) };
}

export function notEmpty<TValue>(
	value: TValue | null | undefined,
): value is TValue {
	return value !== null && value !== undefined;
}

async function fetchCoingeckoCoins(): Promise<CoinMap> {
	const config = {
		headers: {
			"Accept-Encoding": "*",
		},
	};

	const responses = await Promise.all(
		[_coinsUrl, _stablecoinsUrl].map((url) => axios.get(url, config)),
	);

	const coins = create(responses[0], CoingeckoCoinsSchema).data;

	/* console.log("coins: ", coins); */

	const stablecoins = create(responses[1], CoingeckoStablecoinsSchema).data;

	/* console.log("stablecoins: ", stablecoins); */

	const ct = coins
		.map((coin) => {
			const solAddress = coin.platforms?.solana;
			if (typeof solAddress !== "string") return null;

			const coingeckoId = coin?.id;
			if (typeof coingeckoId !== "string") return null;

			const isStablecoin = stablecoins.some((st) => st.id === coingeckoId);

			return { [solAddress]: { coingeckoId, isStablecoin } };
		})
		.filter(notEmpty)
		.reduce((prev, curr) => ({ ...prev, ...curr }), {});

	/* console.log("ct: ", JSON.stringify(ct, null, 4)); */

	return ct;
}

function addSolanaToken(coins: any) {
	const solanaToken = {
		chainId: 101,
		address: "11111111111111111111111111111SOL",
		name: "Solana",
		symbol: "SOL",
		decimals: 9,
		logoURI:
			"https://assets.coingecko.com/coins/images/21629/thumb/solana.jpg?1639626543",
		extensions: { coingeckoId: "solana" },
	};

	coins.push(solanaToken);

	return coins;
}

function filterUndesiredTokens(tokens: any) {
	function isUndesired(coin: CoingeckoCoinSchema | CoingeckoStablecoinSchema) {
		if (!coin?.name || !coin?.symbol) return true;

		const undesiredWords = config.undesiredWords;

		const isInName = undesiredWords.some(function (word) {
			return coin.name.toLowerCase().trim().indexOf(word) !== -1;
		});

		const isInSymbol = undesiredWords.some(function (word) {
			return coin.symbol.toLowerCase().trim().indexOf(word) !== -1;
		});

		return isInName || isInSymbol;
	}

	return {
		...tokens,
		tokens: tokens.tokens.filter((token: any) => !isUndesired(token)),
	};
}

function matchCoingeckoAndOldTokens(cgData: CoingeckoTokenListSchema) {
	const coingecko = create(cgData, CoingeckoTokenListSchema);

	// set the chainId to 101 for the coingecko tokens
	for (const token of coingecko.tokens) {
		token.chainId = 101;
	}

	const oldTokens = fetchOldTokens();

	// gets the tokens from both lists, but if the token is in both lists, it will take the one from the old list.
	// I do this to get the devnet and testnet tokens, that are not present in the coingecko URL

	const allTokens = [...coingecko.tokens];

	for (const oldToken of oldTokens.tokens) {
		const found = allTokens.find(
			(token) =>
				token.address === oldToken.address &&
				token.chainId === oldToken.chainId,
		);

		if (!found) {
			/* console.log("oldToken: ", oldToken); */
			allTokens.push(oldToken);
		}
	}

	/* console.log("allTOkens: ", JSON.stringify(allTokens, null, 4)); */

	coingecko.tokens = allTokens;

	return coingecko;
}

async function matchTokens(coins: CoinMap) /* : Promise<Json> */ {
	const config = {
		headers: {
			"Accept-Encoding": "*",
		},
	};
	const rawCoingecko = await axios.get(_tokenListUrl, config);

	/* console.log("responses: ", rawCoingecko.data); */

	const coingecko =
		/* create(rawCoingecko.data, CoingeckoTokenListSchema); */ matchCoingeckoAndOldTokens(
			rawCoingecko.data,
		);

	coingecko.tokens = coingecko.tokens
		.filter((token) => typeof token === "object")
		.map((token) => updateToken(token, coins));

	const newCgTokens = addSolanaToken(coingecko.tokens);

	coingecko.tokens = newCgTokens;

	return coingecko;
}

function updateToken(
	token: CoingeckoTokenListSchemaToken,
	coins: CoinMap,
): CoingeckoTokenListSchemaToken {
	const address = token.address;

	const coinData = address ? coins[address] : undefined;

	const coingeckoId = coinData?.coingeckoId;
	const isStablecoin = coinData?.isStablecoin || false;

	if (coingeckoId != null) token.extensions = { coingeckoId };
	if (isStablecoin) token.tags = ["stablecoin"];

	/* if (token.chainId == 103) console.log("token: ", token); */

	if (!token.chainId) token.chainId = _mainnetChainId;

	token.logoURI =
		typeof token.logoURI === "string" ? updateLogoUri(token.logoURI) : "";

	return token;
}

function updateLogoUri(uri: string): string {
	if (uri == "") return "";

	try {
		const url = new URL(uri);
		url.pathname = url.pathname.replace("thumb", "large");

		return url.toString();
	} catch (error) {
		console.log("Invalid URI:", uri);
		throw error;
	}
}

async function writeToFile(
	coingecko: Json,
	file = _solanaTokensPath,
): Promise<void> {
	let nonMainnetTokens: Json[] | undefined;
	try {
		const contents = fs.readFileSync(file, "utf8");
		const data = JSON.parse(contents);
		nonMainnetTokens = data.tokens.filter(
			(token: { chainId: number }) => token.chainId !== _mainnetChainId,
		);
	} catch (error) {
		// do nothing
	}

	const allTokens = {
		...coingecko,
		tokens: [...(coingecko.tokens || []), ...(nonMainnetTokens || [])],
	};

	/*   console.log("allTokens: ", JSON.stringify(allTokens, null, 4));
  console.log("non-mainnet: ", JSON.stringify(nonMainnetTokens, null, 4)); */

	await fs.promises.writeFile(file, JSON.stringify(allTokens));
}

export default fetchSolanaTokensAndWriteToFile;

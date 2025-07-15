import axios from "axios";
import * as fs from "fs";
import { _stellarTokensPath } from "../coingeckoTokens/constants";
import type { Json } from "../coingeckoTokens/types";
import { MANUAL_STELLAR_TOKENS } from "./constants";

export default async function fetchStellarTokensAndWriteToFile() {
	// Get Stellar tokens
	const stellarTokens = await fetchStellarTokens();

	// match the stellar tokens with the coingecko ids.
	const coins = await manualCoingeckoMatch(stellarTokens);

	coins.tokens.push({
		symbol: "USDC Dev",
		address: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
		logoURI: "https://www.centre.io/images/usdc/usdc-icon-86074d9d49.png",
		issuer: "GAWZGWFOURKXZ4XYXBGFADZM4QIG6BJNM74XIZCEIU3BHM62RN2MDEZN",
		domain: "centre.io",
		name: "USDC on Stellar Dev",
		org: "Circle",
		coingeckoId: "usd-coin",
		coincodexId: "usdc",
	});

	// Replace USD Coin with USDC on Stellar
	for (const token of coins.tokens) {
		const isUsdc =
			token.address ===
			"CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";
		if (isUsdc) token.name = "USDC on Stellar";
	}

	// console.log('ct: ', JSON.stringify(coins, null, 4));
	// Write to file
	await writeToFile(coins);
}

// -------

// Since Stellar coins are not in the coingecko API, we need to manually match them
// with the coingecko ids manually
async function manualCoingeckoMatch(stellarTokens) {
	const coins = MANUAL_STELLAR_TOKENS;

	const coingecko = stellarTokens.map((token) => {
		const foundToken = coins.find(
			(coin) => coin.symbol === token.symbol && coin.address === token.address,
		);
		return {
			...token,
			...foundToken, // This provides the extra name and coingeckoId
		};
	});

	// Add the stellar token, since it's not in the curated list
	coingecko.push({
		symbol: "XLM",
		name: "Stellar Lumens",
		address: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
		issuer: "11111111111111111111111111111XLM",
		domain: "stellar.org",
		org: "Stellar Development Foundation",
		coingeckoId: "stellar",
		coincodexId: "xlm",
		logoURI:
			"https://raw.githubusercontent.com/JuanRdBO/solana-token-list/main/images/xlm.png",
	});

	return { ...stellarTokens, tokens: coingecko };
}

export async function fetchStellarTokens() {
	const config = {
		headers: {
			"Accept-Encoding": "*",
		},
	};

	const soroSwapTokens = await axios.get(
		"https://raw.githubusercontent.com/soroswap/token-list/refs/heads/main/tokenList.json",
		config,
	);
	const soroSwapTokenFormatted = soroSwapTokens.data.assets.map((token) => {
		return {
			symbol: token.code,
			address: token.contract,
			logoURI: token.icon,
			domain: token.domain,
			name: token.name,
			decimals: token.decimals,
			issuer: token.issuer,
		};
	});

	return soroSwapTokenFormatted;
}

async function writeToFile(
	stellarTokens: Json,
	file = _stellarTokensPath,
): Promise<void> {
	// Create the new structure with listName, description, and tokens array
	const tokenList = {
		listName: "Stellar Token List",
		description:
			"A comprehensive list of tokens available on the Stellar network",
		tokens: stellarTokens.tokens || [],
	};

	/*   console.log("tokenList: ", JSON.stringify(tokenList, null, 4));
    console.log("non-mainnet: ", JSON.stringify(nonMainnetTokens, null, 4)); */

	await fs.promises.writeFile(file, JSON.stringify(tokenList, null, 2));
}

import axios from "axios";
import { CoingeckoTokenListSchemaToken } from "./schema";

const JUP_TOKEN_LIST = "https://lite-api.jup.ag/tokens/v2/tag?query=verified";

export async function fetchSolanaJupiterTokensParsed() {
	const coins = await fetchJupiterTokens();

	return coins;
}

async function fetchJupiterTokens(): Promise<CoingeckoTokenListSchemaToken[]> {
	const jupTokens = await axios.get(JUP_TOKEN_LIST, {
		headers: { "Accept-Encoding": "gzip,deflate,compress" },
	});

	//   console.log('Fetched Jupiter', jupTokens.data[0]);

	return jupTokens.data;
}

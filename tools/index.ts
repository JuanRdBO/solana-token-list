import fetchSolanaTokensAndWriteToFile from "./coingeckoTokens";
import fetchStellarTokensAndWriteToFile from "./stellarTokens";

(async () => {
	console.log("Fetching solana tokens...");
	await fetchSolanaTokensAndWriteToFile();
	console.log("Fetching stellar tokens...");
	await fetchStellarTokensAndWriteToFile();
})();

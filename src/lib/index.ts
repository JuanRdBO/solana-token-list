import {
	SolanaCDNTokenListResolutionStrategy,
	SolanaGitHubTokenListResolutionStrategy,
	SolanaStaticTokenListResolutionStrategy,
	SolanaStrategy,
	SolanaTokenListContainer,
} from "./solana";
import {
	StellarStaticTokenListResolutionStrategy,
	StellarTokenListContainer,
} from "./stellar";
import { StellarStrategy } from "./stellar/types";

export * from "./solana";
export * from "./stellar";

export class TokenListProvider {
	static strategies = {
		solana: {
			[SolanaStrategy.GitHub]: new SolanaGitHubTokenListResolutionStrategy(),
			[SolanaStrategy.Static]: new SolanaStaticTokenListResolutionStrategy(),
			// [Strategy.Solana]: new SolanaTokenListResolutionStrategy(),
			[SolanaStrategy.CDN]: new SolanaCDNTokenListResolutionStrategy(),
		},
		stellar: {
			[StellarStrategy.Static]: new StellarStaticTokenListResolutionStrategy(),
		},
	};

	resolveSolana = async (
		strategy: SolanaStrategy = SolanaStrategy.CDN,
	): Promise<SolanaTokenListContainer> => {
		return new SolanaTokenListContainer(
			await TokenListProvider.strategies.solana[strategy].resolve(),
		);
	};

	resolveStellar = async (
		strategy: StellarStrategy = StellarStrategy.Static,
	): Promise<StellarTokenListContainer> => {
		return new StellarTokenListContainer(
			await TokenListProvider.strategies.stellar[strategy].resolve(),
		);
	};
}

import axios from 'axios';
import { Json } from '../coingeckoTokens/types';
import {
  _coinsUrl,
  _stablecoinsUrl,
  _stellarTokensPath,
} from '../coingeckoTokens/constants';
import * as fs from 'fs';
import { MANUAL_STELLAR_TOKENS } from './constants';

export default async function fetchStellarTokensAndWriteToFile() {
  // Get Stellar tokens
  const stellarTokens = await fetchStellarTokens();

  // match the stellar tokens with the coingecko ids.
  const coins = await manualCoingeckoMatch(stellarTokens);

  // Replace USD Coin with USDC on Stellar
  coins.tokens.forEach((token) => {
    if (
      token.address ===
      'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
    ) {
      token.name = 'USDC on Stellar';
    }
  });

  // console.log('ct: ', JSON.stringify(coins, null, 4));
  // Write to file
  await writeToFile(coins);
}

// -------

// Since Stellar coins are not in the coingecko API, we need to manually match them
// with the coingecko ids manually
async function manualCoingeckoMatch(stellarTokens: any) {
  const coins = MANUAL_STELLAR_TOKENS;

  const coingecko = stellarTokens.tokens.map((token: any) => {
    const foundToken = coins.find(
      (coin: any) =>
        coin.symbol === token.symbol && coin.address === token.address
    );
    return {
      ...token,
      ...foundToken, // This provides the extra name and coingeckoId
    };
  });

  // Add the stellar token, since it's not in the curated list
  coingecko.push({
    symbol: 'XLM',
    name: 'Stellar Lumens',
    address: '11111111111111111111111111111XLM',
    domain: 'stellar.org',
    coingeckoId: 'stellar',
    coincodexId: 'xlm',
    logoURI:
      'https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png',
  });

  return { ...stellarTokens, tokens: coingecko };
}

export async function fetchStellarTokens() {
  const config = {
    headers: {
      'Accept-Encoding': '*',
    },
  };
  const rawCreitTech = await axios.get(
    'https://raw.githubusercontent.com/Creit-Tech/stellar-assets/main/dist/curated-by-creit-tech.json',
    config
  );

  // transform the data to look like the solana tokenlist
  const updatedObject = {
    ...rawCreitTech.data,
    tokens: rawCreitTech.data.assets.map(
      ({
        code,
        publicKey,
        image,
        ...rest
      }: {
        code: string;
        publicKey: string;
        image: string;
      }) => ({
        symbol: code,
        address: publicKey,
        logoURI: image,
        ...rest,
      })
    ),
  };

  // remove the assets key as it is not needed
  delete updatedObject.assets;

  return updatedObject;
}

async function writeToFile(
  stellarTokens: Json,
  file = _stellarTokensPath
): Promise<void> {
  const allTokens = {
    ...stellarTokens,
    tokens: [...(stellarTokens.tokens || [])],
  };

  /*   console.log("allTokens: ", JSON.stringify(allTokens, null, 4));
    console.log("non-mainnet: ", JSON.stringify(nonMainnetTokens, null, 4)); */

  await fs.promises.writeFile(file, JSON.stringify(allTokens));
}

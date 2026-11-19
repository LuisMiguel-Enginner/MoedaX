import { Injectable } from '@angular/core';

export interface MarketAsset {
  symbol: string;
  name: string;
  type: 'crypto' | 'fiat';
  price: string;
  change: string;
  direction: 'up' | 'down';
  icon: string;
  color: string;
}

export interface DemoAccount {
  balance: number;
  deposits: Array<{ amount: number; date: string }>;
  holdings: Record<string, number>;
  investments: Array<{ symbol: string; amount: number; quantity: number; date: string }>;
  transactions: Array<{ type: string; title: string; description: string; amount: number; date: string }>;
  investedTotal: number;
}

const FALLBACK_ASSETS: MarketAsset[] = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 'R$ 621.480,20', change: '+3,84%', direction: 'up', icon: '₿', color: 'btc' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', price: 'R$ 18.942,70', change: '+2,19%', direction: 'up', icon: '◆', color: 'eth' },
  { symbol: 'USD', name: 'Dólar americano', type: 'fiat', price: 'R$ 5,2841', change: '-0,42%', direction: 'down', icon: '$', color: 'usd' },
  { symbol: 'EUR', name: 'Euro', type: 'fiat', price: 'R$ 6,1087', change: '+0,16%', direction: 'up', icon: '€', color: 'eur' },
];

const emptyAccount = (): DemoAccount => ({
  balance: 0,
  deposits: [],
  holdings: {},
  investments: [],
  transactions: [],
  investedTotal: 0,
});

@Injectable({ providedIn: 'root' })
export class MoedaxDataService {
  async getAssets(): Promise<MarketAsset[]> {
    const response = await fetch('/api/assets');
    if (!response.ok) {
      throw new Error('Não foi possível carregar as cotações do servidor.');
    }

    const result = (await response.json()) as { assets?: MarketAsset[] };
    if (!Array.isArray(result.assets) || result.assets.length === 0) {
      throw new Error('O servidor não retornou cotações disponíveis.');
    }
    return result.assets;
  }

  async getHistory(symbol: string): Promise<Array<{ timestamp: number; price: number }>> {
    const response = await fetch(`/api/history?symbol=${encodeURIComponent(symbol)}&period=24h`);
    if (!response.ok) {
      throw new Error(`Não foi possível carregar o histórico de ${symbol}.`);
    }

    const result = (await response.json()) as { history?: Array<{ timestamp: number; price: number }> };
    return Array.isArray(result.history) ? result.history : [];
  }

  getAccount(userId: string): DemoAccount {
    const stored = localStorage.getItem(`moedax_demo_account_${userId}`);
    if (!stored) {
      return emptyAccount();
    }

    try {
      const account = JSON.parse(stored) as Partial<DemoAccount>;
      return {
        ...emptyAccount(),
        ...account,
        deposits: Array.isArray(account.deposits) ? account.deposits : [],
        holdings: account.holdings && typeof account.holdings === 'object' ? account.holdings : {},
        investments: Array.isArray(account.investments) ? account.investments : [],
        transactions: Array.isArray(account.transactions) ? account.transactions : [],
      };
    } catch (error) {
      console.error('Não foi possível ler a conta demo salva.', error);
      return emptyAccount();
    }
  }

  addDeposit(userId: string, amount: number): DemoAccount {
    const account = this.getAccount(userId);
    const date = new Date().toISOString();
    const transaction = {
      type: 'deposit',
      title: 'Depósito na conta demo',
      description: 'Saldo virtual adicionado',
      amount,
      date,
    };
    const updated = {
      ...account,
      balance: account.balance + amount,
      deposits: [{ amount, date }, ...account.deposits],
      transactions: [transaction, ...account.transactions],
    };
    localStorage.setItem(`moedax_demo_account_${userId}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('moedax:account-updated', { detail: updated }));
    return updated;
  }

  getFavoriteSymbols(userId: string, assets: MarketAsset[]): string[] {
    const key = `moedax_favorites_${userId}`;
    const availableSymbols = assets.map((asset) => asset.symbol);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const symbols = JSON.parse(stored) as unknown;
        if (Array.isArray(symbols)) {
          return symbols.filter((symbol): symbol is string => typeof symbol === 'string' && availableSymbols.includes(symbol));
        }
      } catch (error) {
        console.error('Não foi possível ler os ativos favoritos salvos.', error);
      }
    }

    const defaults = ['BTC', 'ETH', 'USD', 'EUR'].filter((symbol) => availableSymbols.includes(symbol));
    this.saveFavoriteSymbols(userId, defaults);
    return defaults;
  }

  saveFavoriteSymbols(userId: string, symbols: string[]): void {
    localStorage.setItem(`moedax_favorites_${userId}`, JSON.stringify(symbols));
  }

  priceInBrl(price: string): number {
    return Number(price.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
  }

  formatBrl(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  changePercent(change: string): number {
    const value = Number(change.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    return change.trim().startsWith('-') ? -Math.abs(value) : value;
  }

  get fallbackAssets(): MarketAsset[] {
    return FALLBACK_ASSETS;
  }
}

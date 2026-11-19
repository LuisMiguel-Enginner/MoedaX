import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthService, CurrentUser } from '../../services/auth.service';
import { DemoAccount, MarketAsset, MoedaxDataService } from '../../services/moedax-data.service';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly data = inject(MoedaxDataService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);

  user?: CurrentUser;
  assets: MarketAsset[] = [];
  favorites: MarketAsset[] = [];
  account: DemoAccount = this.data.getAccount('demo-user-1');
  search = '';
  loading = true;
  message = '';
  chartPath = '';
  today = new Date();

  async ngOnInit(): Promise<void> {
    this.user = await this.auth.getCurrentUser();
    this.account = this.data.getAccount(this.user.id);
    await this.loadDashboard();
  }

  get filteredFavorites(): MarketAsset[] {
    const query = this.search.trim().toLocaleLowerCase();
    if (!query) {
      return this.favorites;
    }
    return this.favorites.filter((asset) =>
      `${asset.name} ${asset.symbol}`.toLocaleLowerCase().includes(query),
    );
  }

  get portfolioValue(): number {
    return this.assets.reduce(
      (total, asset) => total + this.data.priceInBrl(asset.price) * (this.account.holdings[asset.symbol] || 0),
      0,
    );
  }

  get totalBalance(): number {
    return this.account.balance + this.portfolioValue;
  }

  get dailyVariation(): number {
    const positions = this.assets
      .map((asset) => ({
        asset,
        value: this.data.priceInBrl(asset.price) * (this.account.holdings[asset.symbol] || 0),
      }))
      .filter((position) => position.value > 0);
    const selected = positions.length ? positions : this.favorites.map((asset) => ({ asset, value: 1 }));
    const total = selected.reduce((sum, item) => sum + item.value, 0);
    return total
      ? selected.reduce((sum, item) => sum + this.data.changePercent(item.asset.change) * item.value, 0) / total
      : 0;
  }

  get composition(): Array<{ asset: MarketAsset; quantity: number; value: number; percent: number }> {
    const positions = this.assets
      .map((asset) => {
        const quantity = this.account.holdings[asset.symbol] || 0;
        const value = this.data.priceInBrl(asset.price) * quantity;
        return { asset, quantity, value, percent: 0 };
      })
      .filter((position) => position.quantity > 0);
    const total = positions.reduce((sum, position) => sum + position.value, 0);
    return positions.map((position) => ({
      ...position,
      percent: total ? (position.value / total) * 100 : 0,
    }));
  }

  async refresh(): Promise<void> {
    await this.loadDashboard();
  }

  toggleFavorite(asset: MarketAsset): void {
    if (!this.user) {
      return;
    }
    const isFavorite = this.favorites.some((favorite) => favorite.symbol === asset.symbol);
    this.favorites = isFavorite
      ? this.favorites.filter((favorite) => favorite.symbol !== asset.symbol)
      : [...this.favorites, asset];
    this.data.saveFavoriteSymbols(this.user.id, this.favorites.map((favorite) => favorite.symbol));
  }

  deposit(): void {
    const dialog = this.dialog.open(DepositDialogComponent, {
      width: '420px',
      maxWidth: 'calc(100vw - 32px)',
    });
    dialog.afterClosed().subscribe((amount: number | undefined) => {
      if (amount === undefined || !this.user) {
        return;
      }
      this.account = this.data.addDeposit(this.user.id, amount);
      this.changeDetector.markForCheck();
    });
  }

  async signOut(): Promise<void> {
    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/login');
    } catch (error) {
      this.message = this.auth.mapError(error);
      this.changeDetector.markForCheck();
    }
  }

  money(value: number): string {
    return this.data.formatBrl(value);
  }

  percent(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }

  private async loadDashboard(): Promise<void> {
    this.loading = true;
    this.message = '';
    try {
      this.assets = await this.data.getAssets();
    } catch (error) {
      console.error('Erro ao carregar as cotações do dashboard:', error);
      this.assets = this.data.fallbackAssets;
      this.message = error instanceof Error ? `${error.message} Exibindo cotações de demonstração.` : 'Exibindo cotações de demonstração.';
    }

    if (this.user) {
      const favoriteSymbols = new Set(this.data.getFavoriteSymbols(this.user.id, this.assets));
      this.favorites = this.assets.filter((asset) => favoriteSymbols.has(asset.symbol));
      this.account = this.data.getAccount(this.user.id);
    }

    try {
      const history = await this.data.getHistory('BTC');
      const values = history.map((point) => point.price).filter((price) => Number.isFinite(price));
      const min = Math.min(...values);
      const range = Math.max(...values) - min || 1;
      this.chartPath = values.map((price, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * 720;
        const y = 185 - ((price - min) / range) * 140;
        return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
    } catch (error) {
      console.error('Erro ao carregar o histórico de cotações:', error);
      if (!this.message) {
        this.message = error instanceof Error ? error.message : 'O histórico de cotações está indisponível.';
      }
      this.chartPath = 'M0,150 C90,165 145,85 245,115 S390,55 485,85 S625,30 720,48';
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }
}

@Component({
  selector: 'app-deposit-dialog',
  standalone: false,
  template: `
    <h2 mat-dialog-title>Adicionar saldo demo</h2>
    <div mat-dialog-content>
      <p>Adicione um valor virtual para testar o acompanhamento da carteira.</p>
      <mat-form-field appearance="outline" class="deposit-field">
        <mat-label>Valor do depósito (R$)</mat-label>
        <input matInput type="number" min="0.01" max="9999999999.99" step="0.01" [(ngModel)]="amount" name="amount" />
      </mat-form-field>
      <p *ngIf="error" class="deposit-error" role="alert">{{ error }}</p>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()">Confirmar depósito</button>
    </div>
  `,
  styles: [`
    .deposit-field { width: 100%; margin-top: 0.75rem; }
    .deposit-error { color: #a5312b; }
  `],
})
export class DepositDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<DepositDialogComponent>);
  amount: number | null = null;
  error = '';

  confirm(): void {
    if (this.amount === null || !Number.isFinite(this.amount) || this.amount <= 0 || this.amount > 9999999999.99) {
      this.error = 'Digite um valor maior que zero e menor que R$ 10 bilhões.';
      return;
    }
    this.dialogRef.close(this.amount);
  }
}

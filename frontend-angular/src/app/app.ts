import { Component, OnInit, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: false,
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  isAuthRoute = false;
  isDashboardRoute = false;

  ngOnInit(): void {
    this.updateAuthRoute();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => this.updateAuthRoute());
  }

  private updateAuthRoute(): void {
    const path = this.router.url.split('?')[0];
    this.isAuthRoute = ['/login', '/cadastro'].includes(path);
    this.isDashboardRoute = path === '/' || path === '';
    this.document.body.classList.toggle('auth-page', this.isAuthRoute);
    this.document.body.classList.toggle('dashboard-page', this.isDashboardRoute);
    this.setStylesheet('moedax-auth-styles', '/css/auth.css', this.isAuthRoute);
    this.setStylesheet('moedax-dashboard-base-styles', '/css/style.css', this.isDashboardRoute);
    this.setStylesheet('moedax-dashboard-styles', '/css/dashboard.css', this.isDashboardRoute);
    this.setStylesheet('moedax-deposit-styles', '/css/deposito.css', this.isDashboardRoute);
  }

  private setStylesheet(id: string, href: string, enabled: boolean): void {
    const existingStylesheet = this.document.getElementById(id);
    if (enabled && !existingStylesheet) {
      const stylesheet = this.document.createElement('link');
      stylesheet.id = id;
      stylesheet.rel = 'stylesheet';
      stylesheet.href = href;
      this.document.head.appendChild(stylesheet);
    } else if (!enabled) {
      existingStylesheet?.remove();
    }
  }
}

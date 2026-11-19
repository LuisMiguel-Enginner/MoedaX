import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./pages/dashboard/dashboard.module').then((module) => module.DashboardModule),
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then((module) => module.LoginModule),
    title: 'MoedaX | Login',
  },
  {
    path: 'cadastro',
    loadChildren: () => import('./pages/cadastro/cadastro.module').then((module) => module.CadastroModule),
    title: 'MoedaX | Cadastro',
  },
  { path: 'mercado', loadChildren: () => import('./pages/section-page/section-page.module').then((module) => module.SectionPageModule), data: { title: 'Mercado' }, title: 'MoedaX | Mercado' },
  { path: 'alertas', loadChildren: () => import('./pages/section-page/section-page.module').then((module) => module.SectionPageModule), data: { title: 'Alertas' }, title: 'MoedaX | Alertas' },
  { path: 'historico', loadChildren: () => import('./pages/section-page/section-page.module').then((module) => module.SectionPageModule), data: { title: 'Histórico' }, title: 'MoedaX | Histórico' },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

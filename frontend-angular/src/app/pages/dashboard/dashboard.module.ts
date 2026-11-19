import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DashboardComponent, DepositDialogComponent } from './dashboard.component';
import { MaterialModule } from '../../shared/material.module';

@NgModule({
  declarations: [DashboardComponent, DepositDialogComponent],
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    RouterModule.forChild([{ path: '', component: DashboardComponent }]),
  ],
})
export class DashboardModule {}

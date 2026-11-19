import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CadastroComponent } from './cadastro.component';
import { MaterialModule } from '../../shared/material.module';

@NgModule({
  declarations: [CadastroComponent],
  imports: [
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
    RouterModule.forChild([{ path: '', component: CadastroComponent }]),
  ],
})
export class CadastroModule {}

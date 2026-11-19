import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SectionPageComponent } from './section-page.component';
import { MaterialModule } from '../../shared/material.module';

@NgModule({
  declarations: [SectionPageComponent],
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule.forChild([{ path: '', component: SectionPageComponent }]),
  ],
})
export class SectionPageModule {}

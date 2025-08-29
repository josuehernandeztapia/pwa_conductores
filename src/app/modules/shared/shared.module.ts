import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatTabsModule } from '@angular/material/tabs';

const MATERIAL_MODULES = [
  MatToolbarModule,
  MatSidenavModule,
  MatButtonModule,
  MatIconModule,
  MatCardModule,
  MatListModule,
  MatFormFieldModule,
  MatInputModule,
  MatSelectModule,
  MatProgressBarModule,
  MatChipsModule,
  MatBadgeModule,
  MatMenuModule,
  MatDialogModule,
  MatSnackBarModule,
  MatBottomSheetModule,
  MatTabsModule
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ...MATERIAL_MODULES
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ...MATERIAL_MODULES
  ]
})
export class SharedModule { }
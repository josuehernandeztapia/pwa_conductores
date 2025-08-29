import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="'flex items-center justify-center ' + className">
      <img 
        src="https://res.cloudinary.com/dytmjjb9l/image/upload/v1755053362/Add_the_text_Conductores_del_Mundo_below_the_logo_The_text_should_be_small_centered_and_in_the_same_monochromatic_style_as_the_logo_The_logo_features_the_text_Mu_in_white_centered_within_a_teal_i_rbsaxg.png"
        alt="Conductores del Mundo"
        [class]="'object-contain ' + className"
      />
    </div>
  `
})
export class LogoComponent {
  @Input() className: string = 'h-16';
}
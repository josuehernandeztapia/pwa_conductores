import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="bg-gray-900 border-t border-gray-700 py-4 px-4 md:px-8">
      <div class="max-w-7xl mx-auto">
        <div class="text-center">
          <p class="text-sm text-gray-400">
            © 2025 Conductores del Mundo SAPI de CV. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    footer {
      margin-top: auto;
    }
  `]
})
export class FooterComponent {}
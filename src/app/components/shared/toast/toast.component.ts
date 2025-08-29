import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-2">
      @for (toast of toastService.getToasts()(); track toast.id) {
        <div 
          [class]="getToastClasses(toast.type)"
          class="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 transform transition-all duration-300 ease-in-out"
        >
          <div class="flex-1 w-0 p-4">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                @switch (toast.type) {
                  @case ('success') {
                    <svg class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  @case ('error') {
                    <svg class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  @case ('info') {
                    <svg class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                }
              </div>
              <div class="ml-3 w-0 flex-1 pt-0.5">
                <p class="text-sm font-medium text-gray-900">
                  {{ toast.message }}
                </p>
              </div>
            </div>
          </div>
          <div class="flex border-l border-gray-200">
            <button 
              (click)="toastService.removeToast(toast.id)"
              class="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-cyan-500"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);

  getToastClasses(type: 'success' | 'info' | 'error'): string {
    const base = 'transform transition-all duration-300 ease-in-out';
    switch (type) {
      case 'success':
        return `${base} bg-green-50 border-l-4 border-green-400`;
      case 'error':
        return `${base} bg-red-50 border-l-4 border-red-400`;
      case 'info':
        return `${base} bg-blue-50 border-l-4 border-blue-400`;
      default:
        return base;
    }
  }
}
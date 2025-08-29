import { Component, Input, Output, EventEmitter, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <!-- Modal backdrop -->
      <div 
        class="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40"
        (click)="onBackdropClick()"
      ></div>
      
      <!-- Modal dialog -->
      <div class="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div 
          class="bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-all"
          (click)="$event.stopPropagation()"
        >
          <!-- Modal header -->
          <div class="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 class="text-xl font-semibold text-white">{{ title }}</h2>
            <button 
              (click)="close()"
              class="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Modal content -->
          <div class="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class ModalComponent {
  @Input() title: string = '';
  @Output() onClose = new EventEmitter<void>();
  
  protected readonly isOpen = signal(false);

  @Input() 
  set open(value: boolean) {
    this.isOpen.set(value);
  }

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  close() {
    this.isOpen.set(false);
    this.onClose.emit();
  }

  onBackdropClick() {
    this.close();
  }
}
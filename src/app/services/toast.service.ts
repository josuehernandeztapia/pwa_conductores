import { Injectable, signal } from '@angular/core';
import { ToastMessage } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastId = 0;
  protected readonly toasts = signal<ToastMessage[]>([]);

  // Public getter for components to access toasts
  getToasts() {
    return this.toasts.asReadonly();
  }

  success(message: string) {
    this.addToast(message, 'success');
  }

  info(message: string) {
    this.addToast(message, 'info');
  }

  error(message: string) {
    this.addToast(message, 'error');
  }

  private addToast(message: string, type: 'success' | 'info' | 'error') {
    const toast: ToastMessage = {
      id: ++this.toastId,
      message,
      type
    };

    this.toasts.update(toasts => [...toasts, toast]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.removeToast(toast.id);
    }, 5000);
  }

  removeToast(id: number) {
    this.toasts.update(toasts => toasts.filter(t => t.id !== id));
  }
}
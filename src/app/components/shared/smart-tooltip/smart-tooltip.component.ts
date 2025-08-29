import { Component, Input, signal, computed, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TooltipType = 'info' | 'warning' | 'success' | 'error' | 'contextual';
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto';
export type TooltipTrigger = 'hover' | 'click' | 'focus' | 'manual';

export interface TooltipContent {
  title?: string;
  description: string;
  actionText?: string;
  actionCallback?: () => void;
  learnMoreUrl?: string;
  contextualHints?: string[];
}

@Component({
  selector: 'app-smart-tooltip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      #tooltipContainer
      class="tooltip-container"
      [class]="tooltipClasses()"
      [style]="tooltipStyles()"
      *ngIf="isVisible()"
      (mouseleave)="onMouseLeave()"
      (mouseenter)="onMouseEnter()">
      
      <div class="tooltip-content">
        <!-- Title section -->
        <div class="tooltip-header" *ngIf="content()?.title">
          <span class="tooltip-icon">{{ tooltipIcon() }}</span>
          <h4 class="tooltip-title">{{ content()?.title }}</h4>
        </div>
        
        <!-- Main description -->
        <div class="tooltip-body">
          <p class="tooltip-description">{{ content()?.description }}</p>
          
          <!-- Contextual hints -->
          <div class="contextual-hints" *ngIf="content()?.contextualHints && (content()?.contextualHints?.length || 0) > 0">
            <div class="hint-item" *ngFor="let hint of content()?.contextualHints">
              <span class="hint-bullet">•</span>
              <span class="hint-text">{{ hint }}</span>
            </div>
          </div>
        </div>
        
        <!-- Footer with actions -->
        <div class="tooltip-footer" *ngIf="hasFooterContent()">
          <div class="tooltip-actions">
            <button 
              class="tooltip-action-btn"
              *ngIf="content()?.actionText && content()?.actionCallback"
              (click)="executeAction()">
              {{ content()?.actionText }}
            </button>
            
            <a 
              class="tooltip-learn-more"
              *ngIf="content()?.learnMoreUrl"
              [href]="content()?.learnMoreUrl"
              target="_blank"
              rel="noopener">
              Saber más
              <span class="external-icon">↗</span>
            </a>
          </div>
        </div>
      </div>
      
      <!-- Arrow/pointer -->
      <div class="tooltip-arrow" [class]="arrowClass()"></div>
    </div>
  `,
  styleUrls: ['./smart-tooltip.component.scss']
})
export class SmartTooltipComponent implements AfterViewInit, OnDestroy {
  @ViewChild('tooltipContainer') tooltipContainer!: ElementRef<HTMLDivElement>;

  @Input() content = signal<TooltipContent | null>(null);
  @Input() type = signal<TooltipType>('info');
  @Input() position = signal<TooltipPosition>('auto');
  @Input() trigger = signal<TooltipTrigger>('hover');
  @Input() targetElement = signal<HTMLElement | null>(null);
  @Input() delay = signal<number>(500);
  @Input() hideDelay = signal<number>(200);
  @Input() maxWidth = signal<number>(300);

  protected isVisible = signal<boolean>(false);
  private _actualPosition = signal<TooltipPosition>('top');
  private _showTimeout?: number;
  private _hideTimeout?: number;
  private _resizeObserver?: ResizeObserver;

  // Computed properties
  protected readonly tooltipClasses = computed(() => {
    const baseClass = 'smart-tooltip';
    const typeClass = `tooltip-${this.type()}`;
    const positionClass = `position-${this._actualPosition()}`;
    const triggerClass = `trigger-${this.trigger()}`;
    
    return `${baseClass} ${typeClass} ${positionClass} ${triggerClass}`;
  });

  protected readonly tooltipStyles = computed(() => {
    return {
      'max-width': `${this.maxWidth()}px`,
      '--tooltip-max-width': `${this.maxWidth()}px`
    };
  });

  protected readonly tooltipIcon = computed(() => {
    const type = this.type();
    const iconMap: Record<TooltipType, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      success: '✅',
      error: '❌',
      contextual: '💡'
    };
    return iconMap[type] || '💡';
  });

  protected readonly arrowClass = computed(() => {
    return `arrow-${this._actualPosition()}`;
  });

  protected readonly hasFooterContent = computed(() => {
    const content = this.content();
    return !!(content?.actionText || content?.learnMoreUrl);
  });

  ngAfterViewInit(): void {
    this.setupPositionObserver();
  }

  ngOnDestroy(): void {
    this.cleanupTimeouts();
    this._resizeObserver?.disconnect();
  }

  // Public methods for external control
  show(delay?: number): void {
    this.cleanupTimeouts();
    
    const showDelay = delay ?? this.delay();
    
    if (showDelay > 0) {
      this._showTimeout = window.setTimeout(() => {
        this.isVisible.set(true);
        this.updatePosition();
      }, showDelay);
    } else {
      this.isVisible.set(true);
      this.updatePosition();
    }
  }

  hide(delay?: number): void {
    this.cleanupTimeouts();
    
    const hideDelay = delay ?? this.hideDelay();
    
    if (hideDelay > 0) {
      this._hideTimeout = window.setTimeout(() => {
        this.isVisible.set(false);
      }, hideDelay);
    } else {
      this.isVisible.set(false);
    }
  }

  toggle(): void {
    if (this.isVisible()) {
      this.hide(0);
    } else {
      this.show(0);
    }
  }

  // Event handlers
  protected onMouseEnter(): void {
    if (this.trigger() === 'hover') {
      this.cleanupTimeouts();
    }
  }

  protected onMouseLeave(): void {
    if (this.trigger() === 'hover') {
      this.hide();
    }
  }

  protected executeAction(): void {
    const callback = this.content()?.actionCallback;
    if (callback) {
      callback();
      // Optionally hide tooltip after action
      this.hide(0);
    }
  }

  // Position calculation and management
  private updatePosition(): void {
    if (!this.tooltipContainer || !this.targetElement()) {
      return;
    }

    const tooltip = this.tooltipContainer.nativeElement;
    const target = this.targetElement()!;
    const preferredPosition = this.position();
    
    // Reset positioning to measure actual dimensions
    tooltip.style.position = 'fixed';
    tooltip.style.visibility = 'hidden';
    tooltip.style.display = 'block';
    
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    const positions = this.calculatePositions(targetRect, tooltipRect, viewport);
    const optimalPosition = this.findOptimalPosition(positions, preferredPosition);
    
    this._actualPosition.set(optimalPosition.position);
    
    // Apply the calculated position
    tooltip.style.left = `${optimalPosition.x}px`;
    tooltip.style.top = `${optimalPosition.y}px`;
    tooltip.style.visibility = 'visible';
  }

  private calculatePositions(
    targetRect: DOMRect, 
    tooltipRect: DOMRect, 
    viewport: { width: number; height: number }
  ) {
    const gap = 8; // Gap between target and tooltip
    const arrowSize = 6;
    
    return {
      top: {
        position: 'top' as TooltipPosition,
        x: targetRect.left + (targetRect.width - tooltipRect.width) / 2,
        y: targetRect.top - tooltipRect.height - gap - arrowSize,
        fits: targetRect.top - tooltipRect.height - gap - arrowSize >= 0 &&
              targetRect.left + (targetRect.width - tooltipRect.width) / 2 >= 0 &&
              targetRect.left + (targetRect.width + tooltipRect.width) / 2 <= viewport.width
      },
      bottom: {
        position: 'bottom' as TooltipPosition,
        x: targetRect.left + (targetRect.width - tooltipRect.width) / 2,
        y: targetRect.bottom + gap + arrowSize,
        fits: targetRect.bottom + tooltipRect.height + gap + arrowSize <= viewport.height &&
              targetRect.left + (targetRect.width - tooltipRect.width) / 2 >= 0 &&
              targetRect.left + (targetRect.width + tooltipRect.width) / 2 <= viewport.width
      },
      left: {
        position: 'left' as TooltipPosition,
        x: targetRect.left - tooltipRect.width - gap - arrowSize,
        y: targetRect.top + (targetRect.height - tooltipRect.height) / 2,
        fits: targetRect.left - tooltipRect.width - gap - arrowSize >= 0 &&
              targetRect.top + (targetRect.height - tooltipRect.height) / 2 >= 0 &&
              targetRect.top + (targetRect.height + tooltipRect.height) / 2 <= viewport.height
      },
      right: {
        position: 'right' as TooltipPosition,
        x: targetRect.right + gap + arrowSize,
        y: targetRect.top + (targetRect.height - tooltipRect.height) / 2,
        fits: targetRect.right + tooltipRect.width + gap + arrowSize <= viewport.width &&
              targetRect.top + (targetRect.height - tooltipRect.height) / 2 >= 0 &&
              targetRect.top + (targetRect.height + tooltipRect.height) / 2 <= viewport.height
      }
    };
  }

  private findOptimalPosition(
    positions: any, 
    preferredPosition: TooltipPosition
  ) {
    // If preferred position is 'auto', find the best fit
    if (preferredPosition === 'auto') {
      // Priority order: top, bottom, right, left
      const priority: TooltipPosition[] = ['top', 'bottom', 'right', 'left'];
      
      for (const pos of priority) {
        if (positions[pos].fits) {
          return positions[pos];
        }
      }
      
      // If nothing fits perfectly, use top as fallback
      return positions.top;
    }
    
    // Use preferred position if it fits, otherwise find alternative
    if (positions[preferredPosition].fits) {
      return positions[preferredPosition];
    }
    
    // Find the first position that fits
    for (const pos of Object.keys(positions)) {
      if (positions[pos].fits) {
        return positions[pos];
      }
    }
    
    // Fallback to preferred position even if it doesn't fit perfectly
    return positions[preferredPosition];
  }

  private setupPositionObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => {
        if (this.isVisible()) {
          this.updatePosition();
        }
      });
      
      if (this.targetElement()) {
        this._resizeObserver.observe(this.targetElement()!);
      }
      this._resizeObserver.observe(document.body);
    }
  }

  private cleanupTimeouts(): void {
    if (this._showTimeout) {
      window.clearTimeout(this._showTimeout);
      this._showTimeout = undefined;
    }
    if (this._hideTimeout) {
      window.clearTimeout(this._hideTimeout);
      this._hideTimeout = undefined;
    }
  }
}

// Directive for easy tooltip attachment
import { Directive, Input as DirectiveInput, HostListener, OnInit as DirectiveOnInit, OnDestroy as DirectiveOnDestroy, inject } from '@angular/core';
import { Overlay, OverlayRef, OverlayPositionBuilder } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

@Directive({
  selector: '[smartTooltip]',
  standalone: true
})
export class SmartTooltipDirective implements DirectiveOnInit, DirectiveOnDestroy {
  @DirectiveInput('smartTooltip') tooltipContent!: TooltipContent;
  @DirectiveInput('tooltipType') type: TooltipType = 'info';
  @DirectiveInput('tooltipPosition') position: TooltipPosition = 'auto';
  @DirectiveInput('tooltipTrigger') trigger: TooltipTrigger = 'hover';
  @DirectiveInput('tooltipDelay') delay: number = 500;
  @DirectiveInput('tooltipMaxWidth') maxWidth: number = 300;

  private overlay = inject(Overlay);
  private elementRef = inject(ElementRef);
  private positionBuilder = inject(OverlayPositionBuilder);
  
  private overlayRef?: OverlayRef;
  private tooltipComponent?: SmartTooltipComponent;

  ngOnInit(): void {
    this.createOverlay();
  }

  ngOnDestroy(): void {
    this.destroyTooltip();
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.trigger === 'hover') {
      this.showTooltip();
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (this.trigger === 'hover') {
      this.hideTooltip();
    }
  }

  @HostListener('click')
  onClick(): void {
    if (this.trigger === 'click') {
      this.toggleTooltip();
    }
  }

  @HostListener('focus')
  onFocus(): void {
    if (this.trigger === 'focus') {
      this.showTooltip();
    }
  }

  @HostListener('blur')
  onBlur(): void {
    if (this.trigger === 'focus') {
      this.hideTooltip();
    }
  }

  private createOverlay(): void {
    const positionStrategy = this.positionBuilder
      .flexibleConnectedTo(this.elementRef)
      .withPositions([
        { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' },
        { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' },
        { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center' },
        { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center' }
      ])
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: false,
      scrollStrategy: this.overlay.scrollStrategies.reposition()
    });
  }

  private showTooltip(): void {
    if (!this.overlayRef?.hasAttached()) {
      const tooltipPortal = new ComponentPortal(SmartTooltipComponent);
      const componentRef = this.overlayRef!.attach(tooltipPortal);
      this.tooltipComponent = componentRef.instance;

      // Configure tooltip
      this.tooltipComponent.content.set(this.tooltipContent);
      this.tooltipComponent.type.set(this.type);
      this.tooltipComponent.position.set(this.position);
      this.tooltipComponent.trigger.set(this.trigger);
      this.tooltipComponent.delay.set(this.delay);
      this.tooltipComponent.maxWidth.set(this.maxWidth);
      this.tooltipComponent.targetElement.set(this.elementRef.nativeElement);
    }

    this.tooltipComponent?.show();
  }

  private hideTooltip(): void {
    this.tooltipComponent?.hide();
  }

  private toggleTooltip(): void {
    this.tooltipComponent?.toggle();
  }

  private destroyTooltip(): void {
    this.overlayRef?.dispose();
  }
}
import { Injectable, signal, computed } from '@angular/core';
import { fromEvent, startWith, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';
export type LayoutMode = 'compact' | 'comfortable' | 'spacious';

export interface ViewportInfo {
  width: number;
  height: number;
  deviceType: DeviceType;
  orientation: Orientation;
  layoutMode: LayoutMode;
  isTouch: boolean;
  pixelRatio: number;
}

export interface BreakpointConfig {
  mobile: { min: number; max: number };
  tablet: { min: number; max: number };
  desktop: { min: number; max: number };
}

@Injectable({
  providedIn: 'root'
})
export class ResponsiveLayoutService {
  private readonly DEFAULT_BREAKPOINTS: BreakpointConfig = {
    mobile: { min: 0, max: 767 },
    tablet: { min: 768, max: 1023 },
    desktop: { min: 1024, max: Infinity }
  };

  private readonly _breakpoints = signal<BreakpointConfig>(this.DEFAULT_BREAKPOINTS);

  // Viewport dimensions from window resize events
  private readonly _viewportDimensions = toSignal(
    fromEvent(window, 'resize').pipe(
      startWith(null),
      map(() => ({
        width: window.innerWidth,
        height: window.innerHeight
      }))
    ),
    { initialValue: { width: window.innerWidth, height: window.innerHeight } }
  );

  // Orientation from resize and orientation change events
  private readonly _orientation = toSignal(
    fromEvent(window, 'resize').pipe(
      startWith(null),
      map(() => window.innerWidth > window.innerHeight ? 'landscape' : 'portrait')
    ),
    { initialValue: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait' }
  );

  // Computed properties
  readonly viewportWidth = computed(() => this._viewportDimensions().width);
  readonly viewportHeight = computed(() => this._viewportDimensions().height);
  readonly orientation = computed(() => this._orientation() as Orientation);

  readonly deviceType = computed((): DeviceType => {
    const width = this.viewportWidth();
    const breakpoints = this._breakpoints();
    
    if (width >= breakpoints.desktop.min) return 'desktop';
    if (width >= breakpoints.tablet.min) return 'tablet';
    return 'mobile';
  });

  readonly layoutMode = computed((): LayoutMode => {
    const deviceType = this.deviceType();
    const orientation = this.orientation();
    
    if (deviceType === 'mobile') {
      return orientation === 'portrait' ? 'compact' : 'comfortable';
    }
    if (deviceType === 'tablet') {
      return orientation === 'portrait' ? 'comfortable' : 'spacious';
    }
    return 'spacious';
  });

  readonly isTouch = computed(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0);

  readonly pixelRatio = computed(() => window.devicePixelRatio || 1);

  readonly viewportInfo = computed((): ViewportInfo => ({
    width: this.viewportWidth(),
    height: this.viewportHeight(),
    deviceType: this.deviceType(),
    orientation: this.orientation(),
    layoutMode: this.layoutMode(),
    isTouch: this.isTouch(),
    pixelRatio: this.pixelRatio()
  }));

  // Device type checks
  readonly isMobile = computed(() => this.deviceType() === 'mobile');
  readonly isTablet = computed(() => this.deviceType() === 'tablet');
  readonly isDesktop = computed(() => this.deviceType() === 'desktop');

  // Orientation checks
  readonly isPortrait = computed(() => this.orientation() === 'portrait');
  readonly isLandscape = computed(() => this.orientation() === 'landscape');

  // Layout mode checks
  readonly isCompactLayout = computed(() => this.layoutMode() === 'compact');
  readonly isComfortableLayout = computed(() => this.layoutMode() === 'comfortable');
  readonly isSpaciousLayout = computed(() => this.layoutMode() === 'spacious');

  // Responsive design helpers
  readonly shouldUseBottomNavigation = computed(() => 
    this.isMobile() && this.isPortrait()
  );

  readonly shouldUseSidebar = computed(() => 
    this.isDesktop() || (this.isTablet() && this.isLandscape())
  );

  readonly shouldUseFloatingPanels = computed(() => 
    this.isDesktop() || (this.isTablet() && this.isLandscape())
  );

  readonly shouldUseModalFullscreen = computed(() => 
    this.isMobile()
  );

  readonly shouldUseCompactCards = computed(() => 
    this.isMobile() || (this.isTablet() && this.isPortrait())
  );

  readonly shouldShowTooltips = computed(() => 
    !this.isTouch() || this.isDesktop()
  );

  readonly recommendedMaxColumns = computed(() => {
    const deviceType = this.deviceType();
    const orientation = this.orientation();
    
    if (deviceType === 'mobile') return orientation === 'portrait' ? 1 : 2;
    if (deviceType === 'tablet') return orientation === 'portrait' ? 2 : 3;
    return orientation === 'portrait' ? 3 : 4;
  });

  readonly recommendedFontSize = computed(() => {
    const deviceType = this.deviceType();
    const layoutMode = this.layoutMode();
    
    if (deviceType === 'mobile') {
      return layoutMode === 'compact' ? 'sm' : 'base';
    }
    if (deviceType === 'tablet') {
      return layoutMode === 'comfortable' ? 'base' : 'lg';
    }
    return 'lg';
  });

  readonly recommendedSpacing = computed(() => {
    const layoutMode = this.layoutMode();
    
    switch (layoutMode) {
      case 'compact': return 'sm';
      case 'comfortable': return 'base';
      case 'spacious': return 'lg';
      default: return 'base';
    }
  });

  // CSS classes for responsive styling
  readonly responsiveClasses = computed(() => {
    const info = this.viewportInfo();
    return {
      [`device-${info.deviceType}`]: true,
      [`orientation-${info.orientation}`]: true,
      [`layout-${info.layoutMode}`]: true,
      'is-touch': info.isTouch,
      'is-high-dpi': info.pixelRatio > 1
    };
  });

  readonly responsiveClassString = computed(() => {
    const classes = this.responsiveClasses();
    return Object.entries(classes)
      .filter(([, value]) => value)
      .map(([key]) => key)
      .join(' ');
  });

  // Grid system helpers
  readonly gridColumns = computed(() => {
    const deviceType = this.deviceType();
    const orientation = this.orientation();
    
    const configs = {
      mobile: { portrait: 4, landscape: 8 },
      tablet: { portrait: 8, landscape: 12 },
      desktop: { portrait: 12, landscape: 12 }
    };
    
    return configs[deviceType][orientation];
  });

  readonly containerMaxWidth = computed(() => {
    const deviceType = this.deviceType();
    
    switch (deviceType) {
      case 'mobile': return '100%';
      case 'tablet': return '768px';
      case 'desktop': return '1200px';
      default: return '100%';
    }
  });

  // Component sizing recommendations
  readonly buttonSize = computed(() => {
    const deviceType = this.deviceType();
    const isTouch = this.isTouch();
    
    if (isTouch && deviceType === 'mobile') return 'lg';
    if (isTouch) return 'base';
    return deviceType === 'desktop' ? 'sm' : 'base';
  });

  readonly inputSize = computed(() => {
    const deviceType = this.deviceType();
    const isTouch = this.isTouch();
    
    if (isTouch && deviceType === 'mobile') return 'lg';
    return 'base';
  });

  readonly cardPadding = computed(() => {
    const layoutMode = this.layoutMode();
    
    switch (layoutMode) {
      case 'compact': return '12px';
      case 'comfortable': return '16px';
      case 'spacious': return '24px';
      default: return '16px';
    }
  });

  // Methods
  updateBreakpoints(breakpoints: Partial<BreakpointConfig>): void {
    const current = this._breakpoints();
    this._breakpoints.set({
      ...current,
      ...breakpoints
    });
  }

  isBreakpoint(breakpoint: keyof BreakpointConfig): boolean {
    const width = this.viewportWidth();
    const config = this._breakpoints()[breakpoint];
    return width >= config.min && width <= config.max;
  }

  isAboveBreakpoint(breakpoint: keyof BreakpointConfig): boolean {
    const width = this.viewportWidth();
    const config = this._breakpoints()[breakpoint];
    return width >= config.min;
  }

  isBelowBreakpoint(breakpoint: keyof BreakpointConfig): boolean {
    const width = this.viewportWidth();
    const config = this._breakpoints()[breakpoint];
    return width <= config.max;
  }

  // Utility methods for component configuration
  getComponentConfig<T>(configs: Record<DeviceType, T>): T {
    const deviceType = this.deviceType();
    return configs[deviceType];
  }

  getOrientationConfig<T>(configs: Record<Orientation, T>): T {
    const orientation = this.orientation();
    return configs[orientation];
  }

  getLayoutConfig<T>(configs: Record<LayoutMode, T>): T {
    const layoutMode = this.layoutMode();
    return configs[layoutMode];
  }

  // Advanced responsive utilities
  shouldAdaptForFieldWork(): boolean {
    // Field work considerations: outdoor use, one-handed operation, etc.
    return this.isMobile() && this.isTouch();
  }

  getOptimalModalSize(): { width: string; height: string } {
    const deviceType = this.deviceType();
    const orientation = this.orientation();
    
    if (deviceType === 'mobile') {
      return { width: '100%', height: '100%' };
    }
    
    if (deviceType === 'tablet') {
      return orientation === 'portrait' 
        ? { width: '90%', height: '85%' }
        : { width: '70%', height: '90%' };
    }
    
    return { width: '60%', height: '70%' };
  }

  getOptimalPanelPosition(): 'top' | 'bottom' | 'left' | 'right' | 'floating' {
    const deviceType = this.deviceType();
    const orientation = this.orientation();
    
    if (deviceType === 'mobile') {
      return orientation === 'portrait' ? 'bottom' : 'right';
    }
    
    if (deviceType === 'tablet') {
      return orientation === 'portrait' ? 'bottom' : 'floating';
    }
    
    return 'floating';
  }

  getScrollbarWidth(): number {
    // Create a temporary div to measure scrollbar width
    const outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll';
    (outer.style as any).msOverflowStyle = 'scrollbar';
    document.body.appendChild(outer);
    
    const inner = document.createElement('div');
    outer.appendChild(inner);
    
    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
    outer.parentNode?.removeChild(outer);
    
    return scrollbarWidth;
  }

  // Performance considerations
  shouldLazyLoad(): boolean {
    // Lazy load on mobile to save bandwidth and improve performance
    return this.isMobile();
  }

  shouldPreloadImages(): boolean {
    // Preload on desktop/wifi, not on mobile to save data
    return this.isDesktop();
  }

  getRecommendedImageQuality(): 'low' | 'medium' | 'high' {
    const deviceType = this.deviceType();
    const pixelRatio = this.pixelRatio();
    
    if (deviceType === 'mobile') return 'medium';
    if (pixelRatio > 2) return 'high';
    return deviceType === 'desktop' ? 'high' : 'medium';
  }
}
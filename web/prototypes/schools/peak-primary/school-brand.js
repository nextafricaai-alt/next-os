/**
 * School Brand Engine
 * Expands window.__BRAND_* into a full brand system.
 */
(function() {
  // --- Color Utilities ---
  function hexToRgb(hex) {
    if (!hex) return { r: 0, g: 0, b: 0 };
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function rgbToHex(r, g, b) {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }

  function darkenColor(hex, amount) {
    const rgb = hexToRgb(hex);
    return rgbToHex(
      Math.max(0, Math.floor(rgb.r * (1 - amount))),
      Math.max(0, Math.floor(rgb.g * (1 - amount))),
      Math.max(0, Math.floor(rgb.b * (1 - amount)))
    );
  }

  function lightenColor(hex, amount) {
    const rgb = hexToRgb(hex);
    return rgbToHex(
      Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * amount)),
      Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * amount)),
      Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * amount))
    );
  }

  function contrastColor(hex) {
    const rgb = hexToRgb(hex);
    // YIQ formula
    const luminance = (299 * rgb.r + 587 * rgb.g + 114 * rgb.b) / 1000;
    return luminance >= 128 ? '#000000' : '#ffffff';
  }

  function computeShortName(name) {
    if (!name) return '';
    const words = name.trim().split(/\s+/);
    let short = '';
    for (let i = 0; i < Math.min(3, words.length); i++) {
      if (words[i].length > 0) {
        short += words[i][0].toUpperCase();
      }
    }
    return short.substring(0, 3);
  }

  // Fallback initial values from existing globals
  const initialName = window.__BRAND_NAME || 'School Name';
  const initialLogo = window.__BRAND_LOGO || null;
  const computedPrimary = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#1a1a2e';

  const defaultBrand = {
    name: initialName,
    shortName: computeShortName(initialName),
    motto: '',
    address: '',
    phone: '',
    email: '',
    badgeUrl: initialLogo,
    logoUrl: initialLogo,
    colors: {
      primary: computedPrimary,
      secondary: darkenColor(computedPrimary, 0.3),
      accent: '#ffd600',
      bg: '#ffffff',
      text: '#1a1a2e'
    },
    fonts: {
      heading: 'Georgia',
      body: 'Inter'
    },
    niaMimic: null
  };

  const SCHOOL_BRAND = {
    ...defaultBrand,
    colors: { ...defaultBrand.colors },
    fonts: { ...defaultBrand.fonts },

    /**
     * Generates a beautiful inline SVG badge.
     * @param {number} size - Width and height of the SVG.
     * @returns {string} - The inline SVG string.
     */
    getBadgeSvg: function(size = 64) {
      const p = this.colors.primary || '#1a1a2e';
      const s = this.colors.secondary || darkenColor(p, 0.3);
      const a = this.colors.accent || '#ffd600';
      const initials = this.shortName || '??';
      const pLight = lightenColor(p, 0.15);
      
      const fontSize = Math.floor(size * 0.35);
      const center = size / 2;
      
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="badge-grad-${initials}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="${pLight}" />
              <stop offset="100%" stop-color="${p}" />
            </linearGradient>
          </defs>
          
          <!-- Outer border (Secondary) -->
          <circle cx="${center}" cy="${center}" r="${size / 2 - 1.5}" fill="none" stroke="${s}" stroke-width="3" />
          
          <!-- Accent Inner Ring -->
          <circle cx="${center}" cy="${center}" r="${size / 2 - 4.5}" fill="none" stroke="${a}" stroke-width="1.5" />
          
          <!-- Main Inner Fill (Primary Gradient) -->
          <circle cx="${center}" cy="${center}" r="${size / 2 - 6}" fill="url(#badge-grad-${initials})" />
          
          <!-- Star decorative element at 12 o'clock -->
          <text x="${center}" y="${size * 0.18}" font-family="Arial, sans-serif" font-size="${size * 0.12}" fill="${a}" text-anchor="middle" dominant-baseline="middle">⭐</text>
          
          <!-- Bottom laurel representation arc -->
          <path d="M ${size * 0.25} ${size * 0.8} Q ${center} ${size * 0.95} ${size * 0.75} ${size * 0.8}" fill="none" stroke="${s}" stroke-width="1.5" opacity="0.8"/>

          <!-- Initials -->
          <text x="${center}" y="${center + size * 0.05}" font-family="${this.fonts.heading || 'Georgia'}, serif" font-weight="bold" font-size="${fontSize}" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="1">${initials}</text>
        </svg>
      `.trim();
    },

    /**
     * Injects CSS variables onto document.documentElement.
     */
    injectCssVars: function() {
      const root = document.documentElement;
      root.style.setProperty('--school-primary', this.colors.primary);
      root.style.setProperty('--school-secondary', this.colors.secondary);
      root.style.setProperty('--school-accent', this.colors.accent);
      root.style.setProperty('--school-bg', this.colors.bg);
      root.style.setProperty('--school-text', this.colors.text);
      root.style.setProperty('--school-heading-font', this.fonts.heading);
      root.style.setProperty('--school-body-font', this.fonts.body);
    },

    /**
     * Helper to get tenant ID.
     */
    getTenantId: function() {
      return window.NextSession?.profile?.tenantId || window.NextSession?.tenantId || 'default';
    },

    /**
     * Helper to get localStorage cache key.
     */
    getCacheKey: function() {
      return `nextos.brand.full.${this.getTenantId()}`;
    },

    /**
     * Synchronously load cached brand data if available.
     */
    _loadFromCache: function() {
      try {
        const cached = localStorage.getItem(this.getCacheKey());
        if (cached) {
          const parsed = JSON.parse(cached);
          this._applyPatch(parsed);
        }
      } catch (e) {
        console.warn('SCHOOL_BRAND: Failed to load from localStorage', e);
      }
    },

    /**
     * Apply an object patch to the brand properties.
     */
    _applyPatch: function(patch) {
      if (!patch) return;
      if (patch.name) this.name = patch.name;
      this.shortName = computeShortName(this.name);
      
      if (patch.motto !== undefined) this.motto = patch.motto;
      if (patch.address !== undefined) this.address = patch.address;
      if (patch.phone !== undefined) this.phone = patch.phone;
      if (patch.email !== undefined) this.email = patch.email;
      if (patch.badgeUrl !== undefined) this.badgeUrl = patch.badgeUrl;
      if (patch.logoUrl !== undefined) this.logoUrl = patch.logoUrl;
      
      if (patch.colors) {
        if (patch.colors.primary) this.colors.primary = patch.colors.primary;
        if (patch.colors.secondary) this.colors.secondary = patch.colors.secondary;
        if (patch.colors.accent) this.colors.accent = patch.colors.accent;
        if (patch.colors.bg) this.colors.bg = patch.colors.bg;
        if (patch.colors.text) this.colors.text = patch.colors.text;
      }
      // Guarantee fallback secondary exists
      if (!this.colors.secondary && this.colors.primary) {
         this.colors.secondary = darkenColor(this.colors.primary, 0.3);
      }
      
      if (patch.fonts) {
        if (patch.fonts.heading) this.fonts.heading = patch.fonts.heading;
        if (patch.fonts.body) this.fonts.body = patch.fonts.body;
      }
      
      if (patch.niaMimic !== undefined) this.niaMimic = patch.niaMimic;
    },

    /**
     * Re-reads configuration from Supabase and updates the brand state.
     */
    refresh: async function() {
      const tenantId = this.getTenantId();
      if (!tenantId || tenantId === 'default') return;
      
      const sb = window.NextSession?.sb;
      if (!sb) {
        console.warn('SCHOOL_BRAND: No Supabase client found at window.NextSession.sb');
        return;
      }
      
      try {
        const { data, error } = await sb
          .from('school_config')
          .select('name, motto, address, phone, email, primary_color, secondary_color, accent_color, badge_url, logo_url, heading_font, body_font, nia_mimic_profile')
          .eq('tenant_id', tenantId)
          .single();
          
        if (error) throw error;
        if (data) {
          const patch = {
            name: data.name,
            motto: data.motto,
            address: data.address,
            phone: data.phone,
            email: data.email,
            badgeUrl: data.badge_url,
            logoUrl: data.logo_url,
            colors: {
              primary: data.primary_color,
              secondary: data.secondary_color,
              accent: data.accent_color
            },
            fonts: {
              heading: data.heading_font,
              body: data.body_font
            },
            niaMimic: data.nia_mimic_profile
          };
          this._applyPatch(patch);
          localStorage.setItem(this.getCacheKey(), JSON.stringify(this));
          this.injectCssVars();
          document.dispatchEvent(new CustomEvent('school-brand-updated', { detail: this }));
        }
      } catch (err) {
        console.error('SCHOOL_BRAND: refresh failed', err);
      }
    },

    /**
     * Partial update. Saves to localStorage, optional Supabase, injects css, dispatches event.
     * @param {Object} patch - The fields to update
     */
    update: async function(patch) {
      this._applyPatch(patch);
      localStorage.setItem(this.getCacheKey(), JSON.stringify(this));
      this.injectCssVars();
      
      const sb = window.NextSession?.sb;
      const tenantId = this.getTenantId();
      
      if (sb && tenantId && tenantId !== 'default') {
        try {
          const dbPayload = {};
          if (patch.name !== undefined) dbPayload.name = patch.name;
          if (patch.motto !== undefined) dbPayload.motto = patch.motto;
          if (patch.address !== undefined) dbPayload.address = patch.address;
          if (patch.phone !== undefined) dbPayload.phone = patch.phone;
          if (patch.email !== undefined) dbPayload.email = patch.email;
          if (patch.badgeUrl !== undefined) dbPayload.badge_url = patch.badgeUrl;
          if (patch.logoUrl !== undefined) dbPayload.logo_url = patch.logoUrl;
          if (patch.colors?.primary !== undefined) dbPayload.primary_color = patch.colors.primary;
          if (patch.colors?.secondary !== undefined) dbPayload.secondary_color = patch.colors.secondary;
          if (patch.colors?.accent !== undefined) dbPayload.accent_color = patch.colors.accent;
          if (patch.fonts?.heading !== undefined) dbPayload.heading_font = patch.fonts.heading;
          if (patch.fonts?.body !== undefined) dbPayload.body_font = patch.fonts.body;
          if (patch.niaMimic !== undefined) dbPayload.nia_mimic_profile = patch.niaMimic;
          
          if (Object.keys(dbPayload).length > 0) {
            await sb.from('school_config').update(dbPayload).eq('tenant_id', tenantId);
          }
        } catch (e) {
          console.error('SCHOOL_BRAND: Error saving update to Supabase', e);
        }
      }
      
      document.dispatchEvent(new CustomEvent('school-brand-updated', { detail: this }));
    },
    
    init: function() {
      // 1. Load from localStorage cache
      this._loadFromCache();
      // 2. Call injectCssVars immediately
      this.injectCssVars();
      
      // Dispatch ready event
      document.dispatchEvent(new CustomEvent('school-brand-ready', { detail: this }));
      
      // 3. Async fetch from Supabase
      this.refresh();
    }
  };

  // Expose as global
  window.SCHOOL_BRAND = SCHOOL_BRAND;
  
  // Auto-init on DOMContentLoaded, or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.SCHOOL_BRAND.init());
  } else {
    window.SCHOOL_BRAND.init();
  }

})();

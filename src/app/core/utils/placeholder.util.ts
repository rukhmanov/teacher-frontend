/**
 * Утилита для получения заглушек изображений
 */

export class PlaceholderUtil {
  /**
   * Получить заглушку для аватара пользователя
   */
  static getAvatarPlaceholder(): string {
    // Красивая SVG заглушка для аватара с viewBox для масштабирования
    return `data:image/svg+xml;base64,${btoa(`
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ff9a9e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#fecfef;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="200" height="200" fill="url(#avatarGrad)"/>
        <circle cx="100" cy="80" r="35" fill="white" opacity="0.9"/>
        <path d="M 30 180 Q 30 140, 70 140 L 130 140 Q 170 140, 170 180 L 170 200 L 30 200 Z" fill="white" opacity="0.9"/>
      </svg>
    `)}`;
  }

  /**
   * Получить заглушку для изображения поста
   */
  static getPostImagePlaceholder(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="postGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#a8edea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#fed6e3;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#postGrad)"/>
        <circle cx="200" cy="120" r="40" fill="white" opacity="0.8"/>
        <rect x="160" y="180" width="80" height="60" rx="5" fill="white" opacity="0.8"/>
        <text x="200" y="260" font-family="Arial, sans-serif" font-size="24" fill="white" opacity="0.7" text-anchor="middle">📷</text>
      </svg>
    `)}`;
  }

  /**
   * Получить заглушку для фото в галерее
   */
  static getGalleryPlaceholder(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="galleryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ffecd2;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#fcb69f;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="300" height="300" fill="url(#galleryGrad)"/>
        <circle cx="150" cy="100" r="30" fill="white" opacity="0.9"/>
        <rect x="100" y="150" width="100" height="80" rx="5" fill="white" opacity="0.9"/>
        <text x="150" y="250" font-family="Arial, sans-serif" font-size="32" fill="white" opacity="0.8" text-anchor="middle">🖼️</text>
      </svg>
    `)}`;
  }

  /**
   * Получить заглушку для изображения презентации
   */
  static getPresentationPlaceholder(): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="presGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#d299c2;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#fef9d7;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="300" height="200" fill="url(#presGrad)"/>
        <rect x="50" y="40" width="200" height="120" rx="5" fill="white" opacity="0.9"/>
        <line x1="70" y1="60" x2="230" y2="60" stroke="#d299c2" stroke-width="2" opacity="0.6"/>
        <line x1="70" y1="80" x2="200" y2="80" stroke="#d299c2" stroke-width="2" opacity="0.6"/>
        <line x1="70" y1="100" x2="220" y2="100" stroke="#d299c2" stroke-width="2" opacity="0.6"/>
        <text x="150" y="180" font-family="Arial, sans-serif" font-size="28" fill="white" opacity="0.8" text-anchor="middle">📊</text>
      </svg>
    `)}`;
  }

  /**
   * Получить заглушку для общего изображения
   */
  static getImagePlaceholder(width: number = 400, height: number = 300): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="imgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ff9a9e;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#fecfef;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#fecfef;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#imgGrad)"/>
        <circle cx="${width / 2}" cy="${height / 2 - 20}" r="40" fill="white" opacity="0.8"/>
        <rect x="${width / 2 - 50}" y="${height / 2 + 30}" width="100" height="60" rx="5" fill="white" opacity="0.8"/>
        <text x="${width / 2}" y="${height - 30}" font-family="Arial, sans-serif" font-size="24" fill="white" opacity="0.7" text-anchor="middle">🖼️</text>
      </svg>
    `)}`;
  }

  /**
   * Проверить, является ли URL валидным изображением
   */
  static isValidImageUrl(url: string | null | undefined): boolean {
    if (!url || url.trim() === '') {
      return false;
    }
    // Проверяем, что это не placeholder
    if (url.startsWith('data:image/svg+xml')) {
      return true; // SVG data URL валиден
    }
    return url.length > 0;
  }

  /**
   * Получить URL изображения или заглушку
   */
  static getImageUrl(url: string | null | undefined, type: 'avatar' | 'post' | 'gallery' | 'presentation' | 'image' = 'image'): string {
    if (this.isValidImageUrl(url)) {
      return url!;
    }
    
    switch (type) {
      case 'avatar':
        return this.getAvatarPlaceholder();
      case 'post':
        return this.getPostImagePlaceholder();
      case 'gallery':
        return this.getGalleryPlaceholder();
      case 'presentation':
        return this.getPresentationPlaceholder();
      default:
        return this.getImagePlaceholder();
    }
  }
}



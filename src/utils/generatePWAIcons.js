// Utility to generate PWA icons using Canvas API
// This would typically be run as a build step or use actual image files

export function generatePWAIcon(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#2563eb');
  gradient.addColorStop(1, '#1d4ed8');
  
  // Draw background
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Add border radius effect
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.1);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  
  // Draw POS icon (simplified)
  const iconSize = size * 0.4;
  const x = (size - iconSize) / 2;
  const y = (size - iconSize) / 2;
  
  ctx.fillStyle = 'white';
  ctx.font = `${iconSize * 0.8}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('POS', size / 2, size / 2);
  
  return canvas.toDataURL('image/png');
}

// Generate and save icons
export function createPWAIcons() {
  const sizes = [192, 512];
  const icons = {};
  
  sizes.forEach(size => {
    const dataUrl = generatePWAIcon(size);
    icons[size] = dataUrl;
    
    // Create downloadable link (for manual save)
    const link = document.createElement('a');
    link.download = `pwa-${size}x${size}.png`;
    link.href = dataUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
  
  return icons;
}
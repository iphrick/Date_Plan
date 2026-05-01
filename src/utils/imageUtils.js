/**
 * imageUtils.js — Compressão e processamento de imagens client-side
 * Usa Canvas API nativo, zero dependências externas
 */

/**
 * Comprime uma imagem redimensionando e reduzindo qualidade
 * @param {File} file - Arquivo de imagem do input
 * @param {number} maxWidth - Largura máxima (padrão 800px)
 * @param {number} quality - Qualidade JPEG 0-1 (padrão 0.7)
 * @returns {Promise<string>} Data URL da imagem comprimida
 */
export function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensionar mantendo proporção
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Converter para data URL comprimido
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Gera um thumbnail pequeno para preview rápido
 * @param {File} file
 * @param {number} maxWidth - Largura do thumbnail (padrão 200px)
 * @returns {Promise<string>} Data URL do thumbnail
 */
export function generateThumbnail(file, maxWidth = 200) {
  return compressImage(file, maxWidth, 0.6);
}

/**
 * Valida se o arquivo é uma imagem válida
 * @param {File} file
 * @returns {boolean}
 */
export function isValidImage(file) {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  return validTypes.includes(file.type) && file.size <= maxSize;
}

/**
 * Formata o tamanho do arquivo para exibição
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

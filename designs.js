/**
 * Watermark design templates
 */
const designs = {
  classic: {
    id: "classic",
    name: "Classic",
    description: "Clean white frame with logo and camera information",
    thumbnailPath: "assets/designs/classic-landscape.jpg", // Changed from .png to .jpg

    // The rendering function for portrait orientation
    renderPortrait: (params) => {
      const {
        imageWidth,
        frameHeight,
        centerX,
        logoElement,
        cameraInfo,
        exposureInfo,
        dateTimeString,
        fontSize,
        smallFontSize,
        photographerName,
      } = params;

      // Adjust camera and logo positions
      const cameraY = frameHeight * 0.4; // Moved up slightly
      const logoY = frameHeight * 0.3; // Moved up significantly from 0.85 to 0.7
      const exposureY = frameHeight * 1.4; // Moved down from 1.2 to 1.3
      const dateY = frameHeight * 1.8; // Moved down from 1.6 to 1.7

      // Move photographer name lower and make it smaller
      const photographerElement = photographerName
        ? `<text x="${imageWidth - 20}" y="${
            frameHeight * 1.85
          }" font-family="Arial, sans-serif" font-size="${
            smallFontSize * 0.75
          }" font-weight="400" fill="#666666" text-anchor="end" dominant-baseline="middle">Taken by: ${photographerName}</text>`
        : "";

      return `
      <svg width="${imageWidth}" height="${
        frameHeight * 2
      }" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1.0" />
            <stop offset="100%" style="stop-color:#F8F8F8;stop-opacity:1.0" />
          </linearGradient>
        </defs>
        <rect width="${imageWidth}" height="${
        frameHeight * 2
      }" fill="url(#grad)"/>
        <text x="${centerX}" y="${cameraY}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#111111" text-anchor="middle" dominant-baseline="middle">${cameraInfo}</text>
        ${logoElement}
        <text x="${centerX}" y="${exposureY}" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="700" fill="#666666" text-anchor="middle" dominant-baseline="middle">${exposureInfo}</text>
        <text x="${centerX}" y="${dateY}" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="700" fill="#666666" text-anchor="middle" dominant-baseline="middle">${dateTimeString}</text>
        ${photographerElement}
      </svg>`;
    },

    // The rendering function for landscape orientation
    renderLandscape: (params) => {
      const {
        imageWidth,
        frameHeight,
        centerY,
        textAdjustment,
        logoAdjustment,
        logoElement,
        cameraInfo,
        exposureInfo,
        dateTimeString,
        leftTextX,
        rightTextX,
        exposureY,
        dateY,
        dividerX,
        adjustedDividerTop,
        adjustedDividerBottom,
        fontSize,
        smallFontSize,
        photographerName,
      } = params;

      // Move photographer credit up slightly - reduce the Y offset
      const photographerElement = photographerName
        ? `<text x="${leftTextX}" y="${
            centerY + textAdjustment + fontSize * 0.9
          }" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="500" fill="#333333" dominant-baseline="central">Taken by: ${photographerName}</text>`
        : "";

      return `
      <svg width="${imageWidth}" height="${frameHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1.0" />
            <stop offset="100%" style="stop-color:#F8F8F8;stop-opacity:1.0" />
          </linearGradient>
        </defs>
        <rect width="${imageWidth}" height="${frameHeight}" fill="url(#grad)"/>
        <text x="${leftTextX}" y="${
        centerY + textAdjustment
      }" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#111111" dominant-baseline="central" letter-spacing="0.5">${cameraInfo}</text>
        ${photographerElement}
        ${logoElement}
        <line x1="${dividerX}" y1="${adjustedDividerTop}" x2="${dividerX}" y2="${adjustedDividerBottom}" stroke="#CCCCCC" stroke-width="2"/>
        ${
          exposureInfo
            ? `<text x="${rightTextX}" y="${exposureY}" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="700" fill="#333333" text-anchor="end" dominant-baseline="central">${exposureInfo}</text>`
            : ""
        }
        ${
          dateTimeString
            ? `<text x="${rightTextX}" y="${dateY}" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="700" fill="#666666" text-anchor="end" dominant-baseline="central">${dateTimeString}</text>`
            : ""
        }
      </svg>`;
    },
  },

  dark: {
    id: "dark",
    name: "Dark", // Changed from "Dark Theme" to just "Dark"
    description: "Elegant dark frame for your photos",
    thumbnailPath: "assets/designs/dark-landscape.jpg",

    // The rendering function for portrait orientation - matching classic layout
    renderPortrait: (params) => {
      const {
        imageWidth,
        frameHeight,
        centerX,
        logoElement,
        cameraInfo,
        exposureInfo,
        dateTimeString,
        fontSize,
        smallFontSize,
        photographerName,
      } = params;

      // Use same layout as classic, but with dark colors
      const cameraY = frameHeight * 0.4;
      const logoY = frameHeight * 0.3;
      const exposureY = frameHeight * 1.4;
      const dateY = frameHeight * 1.8;

      // Move photographer name lower and make it smaller
      const photographerElement = photographerName
        ? `<text x="${imageWidth - 20}" y="${
            frameHeight * 1.85
          }" font-family="Arial, sans-serif" font-size="${
            smallFontSize * 0.75
          }" font-weight="400" fill="#888888" text-anchor="end" dominant-baseline="middle">Taken by: ${photographerName}</text>`
        : "";

      return `
      <svg width="${imageWidth}" height="${
        frameHeight * 2
      }" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#222222;stop-opacity:1.0" />
            <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1.0" />
          </linearGradient>
        </defs>
        <rect width="${imageWidth}" height="${
        frameHeight * 2
      }" fill="url(#grad)"/>
        <text x="${centerX}" y="${cameraY}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${cameraInfo}</text>
        ${logoElement}
        <text x="${centerX}" y="${exposureY}" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="700" fill="#AAAAAA" text-anchor="middle" dominant-baseline="middle">${exposureInfo}</text>
        <text x="${centerX}" y="${dateY}" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="700" fill="#888888" text-anchor="middle" dominant-baseline="middle">${dateTimeString}</text>
        ${photographerElement}
      </svg>`;
    },

    // The rendering function for landscape orientation - matching classic layout
    renderLandscape: (params) => {
      const {
        imageWidth,
        frameHeight,
        centerY,
        textAdjustment,
        logoAdjustment,
        logoElement,
        cameraInfo,
        exposureInfo,
        dateTimeString,
        leftTextX,
        rightTextX,
        exposureY,
        dateY,
        dividerX,
        adjustedDividerTop,
        adjustedDividerBottom,
        fontSize,
        smallFontSize,
        photographerName,
      } = params;

      // Move photographer credit up slightly - reduce the Y offset
      const photographerElement = photographerName
        ? `<text x="${leftTextX}" y="${
            centerY + textAdjustment + fontSize * 0.9
          }" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="500" fill="#AAAAAA" dominant-baseline="central">Taken by: ${photographerName}</text>`
        : "";

      return `
      <svg width="${imageWidth}" height="${frameHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#222222;stop-opacity:1.0" />
            <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1.0" />
          </linearGradient>
        </defs>
        <rect width="${imageWidth}" height="${frameHeight}" fill="url(#grad)"/>
        <text x="${leftTextX}" y="${
        centerY + textAdjustment
      }" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#FFFFFF" dominant-baseline="central" letter-spacing="0.5">${cameraInfo}</text>
        ${photographerElement}
        ${logoElement}
        <line x1="${dividerX}" y1="${adjustedDividerTop}" x2="${dividerX}" y2="${adjustedDividerBottom}" stroke="#444444" stroke-width="2"/>
        ${
          exposureInfo
            ? `<text x="${rightTextX}" y="${exposureY}" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="700" fill="#AAAAAA" text-anchor="end" dominant-baseline="central">${exposureInfo}</text>`
            : ""
        }
        ${
          dateTimeString
            ? `<text x="${rightTextX}" y="${dateY}" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="700" fill="#888888" text-anchor="end" dominant-baseline="central">${dateTimeString}</text>`
            : ""
        }
      </svg>`;
    },
  },

  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Sleek, modern design with minimal elements",
    thumbnailPath: "assets/designs/minimal-landscape.jpg", // Changed from .png to .jpg

    renderPortrait: (params) => {
      const {
        imageWidth,
        frameHeight,
        centerX,
        logoElement,
        cameraInfo,
        exposureInfo,
        dateTimeString,
        fontSize,
        smallFontSize,
        photographerName,
      } = params;

      // Center the photographer name at the bottom
      const photographerElement = photographerName
        ? `<text x="${centerX}" y="${
            frameHeight * 1.8 // Move lower to the bottom
          }" font-family="Arial, sans-serif" font-size="${
            smallFontSize * 0.9
          }" font-weight="300" fill="#999999" text-anchor="middle" dominant-baseline="middle">Taken by: ${photographerName}</text>`
        : "";

      return `
      <svg width="${imageWidth}" height="${
        frameHeight * 2
      }" xmlns="http://www.w3.org/2000/svg">
        <rect width="${imageWidth}" height="${frameHeight * 2}" fill="#FFFFFF"/>
        <line x1="0" y1="0" x2="${imageWidth}" y2="0" stroke="#EEEEEE" stroke-width="2"/>
        <text x="${centerX}" y="${
        frameHeight * 0.5
      }" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="300" fill="#333333" text-anchor="middle" dominant-baseline="middle">${cameraInfo}</text>
        <text x="${centerX}" y="${
        frameHeight * 1.5
      }" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="300" fill="#999999" text-anchor="middle" dominant-baseline="middle">${exposureInfo} · ${dateTimeString}</text>
        ${photographerElement}
      </svg>`;
    },

    renderLandscape: (params) => {
      const {
        imageWidth,
        frameHeight,
        centerY,
        logoElement,
        cameraInfo,
        exposureInfo,
        dateTimeString,
        leftTextX,
        smallFontSize,
        photographerName,
      } = params;

      // Position photographer credit on the right side, aligned with date/exposure text
      const photographerElement = photographerName
        ? `<text x="${imageWidth - 20}" y="${
            centerY + 80 // Change from 40 to 80 to align with date
          }" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="300" fill="#999999" text-anchor="end" dominant-baseline="central">Taken by: ${photographerName}</text>`
        : "";

      return `
      <svg width="${imageWidth}" height="${frameHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${imageWidth}" height="${frameHeight}" fill="#FFFFFF"/>
        <line x1="0" y1="0" x2="${imageWidth}" y2="0" stroke="#EEEEEE" stroke-width="2"/>
        <text x="${leftTextX}" y="${
        centerY - 5
      }" font-family="Arial, sans-serif" font-size="${
        smallFontSize * 1.2
      }" font-weight="300" fill="#333333" dominant-baseline="central">${cameraInfo}</text>
        ${photographerElement}
        <text x="${leftTextX}" y="${
        centerY + 80
      }" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="300" fill="#999999" dominant-baseline="central">${exposureInfo} · ${dateTimeString}</text>
      </svg>`;
    },
  },

  vintage: {
    id: "vintage",
    name: "Vintage",
    description: "Classic film-inspired border",
    thumbnailPath: "assets/designs/vintage-landscape.jpg", // Changed from .png to .jpg

    renderPortrait: (params) => {
      const {
        imageWidth,
        frameHeight,
        centerX,
        logoElement,
        cameraInfo,
        exposureInfo,
        dateTimeString,
        fontSize,
        smallFontSize,
        photographerName,
      } = params;

      // Move exposureInfo text up to be right below cameraInfo
      const cameraY = frameHeight * 0.4;
      const exposureY = frameHeight * 0.7; // Changed from 1.5 to 0.7
      const dateY = frameHeight * 1.8;

      // Add photographer name in bottom right, small size
      const photographerElement = photographerName
        ? `<text x="${imageWidth - 20}" y="${
            frameHeight * 1.6
          }" font-family="Courier, monospace" font-size="${
            smallFontSize * 0.8
          }" font-weight="400" fill="#91785E" text-anchor="end" dominant-baseline="middle">Taken by: ${photographerName}</text>`
        : "";

      return `
      <svg width="${imageWidth}" height="${
        frameHeight * 2
      }" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grain" patternUnits="userSpaceOnUse" width="100" height="100">
            <image href="data:image/png;base64,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" x="0" y="0" width="100" height="100" />
          </pattern>
        </defs>
        <rect width="${imageWidth}" height="${frameHeight * 2}" fill="#F8F5E9"/>
        <rect width="${imageWidth}" height="${
        frameHeight * 2
      }" fill="url(#grain)" opacity="0.1"/>
        <text x="20" y="${cameraY}" font-family="Courier, monospace" font-size="${fontSize}" font-weight="700" fill="#70573B">${cameraInfo}</text>
        <text x="20" y="${exposureY}" font-family="Courier, monospace" font-size="${smallFontSize}" font-weight="400" fill="#91785E">${exposureInfo}</text>
        <text x="${
          imageWidth - 20
        }" y="${dateY}" font-family="Courier, monospace" font-size="${
        smallFontSize * 0.8
      }" font-weight="400" fill="#91785E" text-anchor="end">${dateTimeString}</text>
        ${photographerElement}
      </svg>`;
    },

    renderLandscape: (params) => {
      const {
        imageWidth,
        frameHeight,
        centerY,
        cameraInfo,
        exposureInfo,
        dateTimeString,
        smallFontSize,
        photographerName,
      } = params;

      // Move photographer credit to right side aligned with exposure info and reduce text size
      const photographerElement = photographerName
        ? `<text x="${imageWidth - 20}" y="${
            centerY + 70
          }" font-family="Courier, monospace" font-size="${
            smallFontSize * 0.8
          }" font-weight="400" fill="#91785E" text-anchor="end">Taken by: ${photographerName}</text>`
        : "";

      return `
      <svg width="${imageWidth}" height="${frameHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grain" patternUnits="userSpaceOnUse" width="100" height="100">
            <image href="data:image/png;base64,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" x="0" y="0" width="100" height="100" />
          </pattern>
        </defs>
        <rect width="${imageWidth}" height="${frameHeight}" fill="#F8F5E9"/>
        <rect width="${imageWidth}" height="${frameHeight}" fill="url(#grain)" opacity="0.1"/>
        <text x="20" y="${
          centerY - 10
        }" font-family="Courier, monospace" font-size="${
        smallFontSize * 1.2
      }" font-weight="700" fill="#70573B">${cameraInfo}</text>
        ${photographerElement}
        <text x="20" y="${
          centerY + 70
        }" font-family="Courier, monospace" font-size="${smallFontSize}" font-weight="400" fill="#91785E">${exposureInfo}</text>
        <text x="${
          imageWidth - 20
        }" y="${centerY}" font-family="Courier, monospace" font-size="${
        smallFontSize * 0.8
      }" font-weight="400" fill="#91785E" text-anchor="end">${dateTimeString}</text>
      </svg>`;
    },
  },
};

// Get a list of all available designs
function getDesignList() {
  return Object.values(designs).map((design) => ({
    id: design.id,
    name: design.name,
    description: design.description,
    thumbnailPath: design.thumbnailPath,
  }));
}

// Get a specific design by ID
function getDesignById(id) {
  return designs[id] || designs.classic; // Default to classic if not found
}

module.exports = {
  getDesignList,
  getDesignById,
  defaultDesign: "classic",
};

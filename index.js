const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const ExifParser = require("exif-parser");

async function addWatermarkFrame(inputImagePath, outputPath) {
  try {
    const imageBuffer = fs.readFileSync(inputImagePath);

    let exifData = {};
    try {
      const parser = ExifParser.create(imageBuffer);
      exifData = parser.parse();
    } catch (error) {
      console.log(`Error reading EXIF data for ${inputImagePath}:`, error);
    }

    const metadata = await sharp(imageBuffer).metadata();

    const cameraModel = exifData.tags
      ? exifData.tags.Model || "Unknown Camera"
      : "Unknown Camera";
    const cameraMake = exifData.tags ? exifData.tags.Make || "" : "";

    const focalLength = exifData.tags
      ? exifData.tags.FocalLength
        ? `${Math.round(exifData.tags.FocalLength)}mm`
        : ""
      : "";
    const fNumber = exifData.tags
      ? exifData.tags.FNumber
        ? `f/${exifData.tags.FNumber.toFixed(1)}`
        : ""
      : "";
    const exposureTime = exifData.tags
      ? exifData.tags.ExposureTime
        ? `1/${Math.round(1 / exifData.tags.ExposureTime)}`
        : ""
      : "";
    const iso = exifData.tags ? exifData.tags.ISO || "" : "";

    let dateTimeString = "";
    if (exifData.tags && exifData.tags.DateTimeOriginal) {
      const date = new Date(exifData.tags.DateTimeOriginal * 1000);
      dateTimeString =
        date.toISOString().slice(0, 10).replace(/-/g, ".") +
        " " +
        date.toTimeString().slice(0, 8);
    }

    const result = await createPremiumWatermark(
      imageBuffer,
      metadata,
      cameraMake,
      cameraModel,
      focalLength,
      fNumber,
      exposureTime,
      iso,
      dateTimeString
    );

    await result.toFile(outputPath);
    console.log(`Watermarked image saved as: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`Error processing ${inputImagePath}:`, error);
    return null;
  }
}

async function createPremiumWatermark(
  imageBuffer,
  metadata,
  cameraMake,
  cameraModel,
  focalLength,
  fNumber,
  exposureTime,
  iso,
  dateTimeString
) {
  try {
    const processedImage = sharp(imageBuffer, { failOnError: false }).rotate();
    const processedMetadata = await processedImage.toBuffer({
      resolveWithObject: true,
    });

    const imageWidth = processedMetadata.info.width;
    const imageHeight = processedMetadata.info.height;

    const frameHeight = Math.round(imageHeight * 0.1); // 10% of image height

    const fontSize = Math.max(14, Math.round(frameHeight * 0.3));
    const smallFontSize = Math.max(11, Math.round(fontSize * 0.75));

    let cameraInfo = `${cameraModel}`.trim();

    if (cameraInfo.includes("iPhone")) {
      cameraInfo = `Apple ${cameraInfo}`;
    }

    const normalizedMake = cameraMake.toLowerCase().trim();

    let exposureInfo = "";
    if (focalLength) exposureInfo += focalLength;
    if (fNumber) exposureInfo += (exposureInfo ? " | " : "") + fNumber;
    if (exposureTime)
      exposureInfo += (exposureInfo ? " | " : "") + exposureTime;
    if (iso) exposureInfo += (exposureInfo ? " | ISO " : "ISO ") + iso;

    let brandLogo = "";
    try {
      const logoPath = path.join(__dirname, "assets", `${normalizedMake}.svg`);
      brandLogo = fs.readFileSync(logoPath, "utf8");
    } catch (error) {
      console.log(`Error loading logo file for ${cameraMake}. Using fallback.`);
      brandLogo = `<text x="0" y="${fontSize}" font-family="Arial" font-size="${fontSize}" font-weight="bold" fill="#333333">${cameraMake}</text>`;
    }

    const isPortrait = imageHeight > imageWidth;

    if (isPortrait) {
      const logoScale = fontSize / 1500;
      const logoHeight = fontSize * 1.5;
      const centerX = imageWidth / 2;

      const watermarkSvg = `
      <svg width="${imageWidth}" height="${
        frameHeight * 2
      }" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1.0" />
            <stop offset="100%" style="stop-color:#F8F8F8;stop-opacity:1.0" />
          </linearGradient>
        </defs>
        <rect width="${imageWidth}" height="${
        frameHeight * 2
      }" fill="url(#grad)"/>
        
        <!-- Camera model on top -->
        <text x="${centerX}" y="${
        fontSize * 1.5
      }" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#111111" text-anchor="middle" dominant-baseline="middle">${cameraInfo}</text>
        
        <!-- Brand logo in the center -->
        <g transform="translate(${centerX - logoHeight / 2}, ${
        frameHeight - logoHeight * 0.85
      }) scale(${logoScale})">
          ${brandLogo}
        </g>
        
        <!-- Exposure info at the bottom -->
        <text x="${centerX}" y="${
        frameHeight * 1.5
      }" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="700" fill="#666666" text-anchor="middle" dominant-baseline="middle">${exposureInfo}</text>
        <text x="${centerX}" y="${
        frameHeight * 1.8
      }" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="700" fill="#666666" text-anchor="middle">${dateTimeString}</text>
      </svg>`;

      const watermarkBuffer = Buffer.from(watermarkSvg);

      return sharp(processedMetadata.data)
        .withMetadata()
        .extend({
          top: frameHeight,
          bottom: frameHeight,
          left: 0,
          right: 0,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .composite([
          {
            input: watermarkBuffer,
            top: imageHeight,
            left: 0,
          },
        ]);
    } else {
      const leftPadding = Math.max(30, imageWidth * 0.02);
      const rightPadding = Math.max(30, imageWidth * 0.02);
      const leftTextX = leftPadding;
      const centerY = frameHeight / 2;

      const logoScale = fontSize / 1500;
      const logoHeight = fontSize * 1.5;
      const logoX = imageWidth - leftPadding - fontSize * 2;
      const dividerX = logoX - fontSize * 1.2;
      const textX = dividerX - fontSize * 1.8;
      const dividerHeight = frameHeight * 0.6;
      const dividerY = frameHeight * 0.2;

      const watermarkSvg = `
      <svg width="${imageWidth}" height="${frameHeight}" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1.0" />
            <stop offset="100%" style="stop-color:#F8F8F8;stop-opacity:1.0" />
          </linearGradient>
        </defs>
        <rect width="${imageWidth}" height="${frameHeight}" fill="url(#grad)"/>
        
        <!-- Camera model on the left -->
        <text x="${leftTextX}" y="${centerY}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#111111" dominant-baseline="middle" letter-spacing="0.5">${cameraInfo}</text>
        
        <!-- Brand logo -->
        <g transform="translate(${logoX}, ${
        centerY - logoHeight / 2
      }) scale(${logoScale})">
          ${brandLogo}
        </g>
        
        <!-- Vertical divider -->
        <line x1="${dividerX}" y1="${dividerY}" x2="${dividerX}" y2="${
        dividerY + dividerHeight
      }" stroke="#CCCCCC" stroke-width="2"/>
        
        <!-- Exposure info -->
        <text x="${textX}" y="${
        centerY - fontSize / 2
      }" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#333333" text-anchor="end" dominant-baseline="middle">${exposureInfo}</text>
        <text x="${textX}" y="${
        centerY + fontSize
      }" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="700" fill="#666666" text-anchor="end">${dateTimeString}</text>
      </svg>`;

      const watermarkBuffer = Buffer.from(watermarkSvg);

      return sharp(processedMetadata.data)
        .withMetadata()
        .extend({
          top: 0,
          bottom: frameHeight,
          left: 0,
          right: 0,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .composite([
          {
            input: watermarkBuffer,
            top: imageHeight,
            left: 0,
          },
        ]);
    }
  } catch (error) {
    console.error("Error creating watermark:", error);
    return sharp(imageBuffer).withMetadata();
  }
}

async function processBulkImages(rawFolder, processedFolder) {
  try {
    if (!fs.existsSync(processedFolder)) {
      fs.mkdirSync(processedFolder, { recursive: true });
    }

    const files = fs.readdirSync(rawFolder);

    const imageExtensions = [".jpg", ".jpeg", ".png", ".tiff", ".webp"];
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });

    console.log(`Found ${imageFiles.length} images to process.`);

    const promises = imageFiles.map(async (file) => {
      const inputPath = path.join(rawFolder, file);
      const outputPath = path.join(processedFolder, file);

      return addWatermarkFrame(inputPath, outputPath);
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(Boolean).length;

    console.log(
      `Successfully processed ${successCount} of ${imageFiles.length} images.`
    );
  } catch (error) {
    console.error("Error in bulk processing:", error);
  }
}

function main() {
  const args = process.argv.slice(2);

  let rawFolder = "raw";
  let processedFolder = "processed";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--raw" && i + 1 < args.length) {
      rawFolder = args[i + 1];
      i++;
    } else if (args[i] === "--processed" && i + 1 < args.length) {
      processedFolder = args[i + 1];
      i++;
    }
  }

  if (!fs.existsSync(rawFolder)) {
    console.error(`Error: Raw folder "${rawFolder}" does not exist.`);
    process.exit(1);
  }

  console.log(`Processing images from "${rawFolder}" to "${processedFolder}"`);

  processBulkImages(rawFolder, processedFolder)
    .then(() => {
      console.log("Processing complete.");
    })
    .catch((err) => {
      console.error("Error processing images:", err);
    });
}

if (require.main === module) {
  main();
}

module.exports = { addWatermarkFrame, processBulkImages };

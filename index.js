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

    const frameHeight = Math.round(imageHeight * 0.1);
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
      const logoPath = path.join(__dirname, "assets", `${normalizedMake}.png`);
      const logoBuffer = fs.readFileSync(logoPath);
      const logoBase64 = logoBuffer.toString("base64");
      brandLogo = `data:image/png;base64,${logoBase64}`;
    } catch (error) {
      console.log(`Error loading PNG logo for ${cameraMake}. Using fallback.`);
      brandLogo = null;
    }

    const isPortrait = imageHeight > imageWidth;

    if (isPortrait) {
      const centerX = imageWidth / 2;

      const logoHeight = Math.round(frameHeight * 0.5);
      const logoWidth = logoHeight * 1.5;

      const cameraY = frameHeight * 0.4;
      const exposureY = frameHeight * 1.35;
      const dateY = frameHeight * 1.7;

      const logoY = cameraY * 0.6 + exposureY * 0.4 - logoHeight / 2;
      const logoX = centerX - logoWidth / 2;

      const logoElement = brandLogo
        ? `<image x="${logoX}" y="${logoY}" width="${logoWidth}" height="${logoHeight}" href="${brandLogo}" preserveAspectRatio="xMidYMid meet" />`
        : `<text x="${centerX}" y="${
            cameraY * 0.6 + exposureY * 0.4
          }" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#333333" text-anchor="middle" dominant-baseline="central">${cameraMake}</text>`;

      const bottomFrameSvg = `
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
      </svg>`;

      const bottomBuffer = Buffer.from(bottomFrameSvg);

      return sharp(processedMetadata.data)
        .withMetadata()
        .extend({
          top: 0,
          bottom: frameHeight * 2,
          left: 0,
          right: 0,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .composite([
          {
            input: bottomBuffer,
            top: imageHeight,
            left: 0,
          },
        ]);
    } else {
      const leftPadding = Math.max(30, imageWidth * 0.02);
      const rightPadding = Math.max(30, imageWidth * 0.02);

      const centerY = frameHeight / 2;

      const textAdjustment = Math.round(frameHeight * 0.08);
      const logoAdjustment = Math.round(frameHeight * 0.03);

      const logoHeight = Math.round(frameHeight * 0.6);
      const logoWidth = logoHeight * 1.5;
      const logoX = imageWidth - rightPadding - logoWidth;
      const logoY = centerY - logoHeight / 2 + logoAdjustment;

      const dividerX = logoX - fontSize * 2;
      const dividerHeight = frameHeight * 0.6;

      const leftTextX = leftPadding;
      const rightTextX = dividerX - fontSize;

      let exposureY, dateY;
      if (exposureInfo && dateTimeString) {
        const lineSpacing = smallFontSize * 1.5;
        exposureY = centerY - lineSpacing / 2 + textAdjustment;
        dateY = centerY + lineSpacing / 2 + textAdjustment;
      } else {
        exposureY = centerY + textAdjustment;
        dateY = centerY + textAdjustment;
      }

      const adjustedDividerTop = centerY - dividerHeight / 2 + logoAdjustment;
      const adjustedDividerBottom =
        centerY + dividerHeight / 2 + logoAdjustment;

      const logoElement = brandLogo
        ? `<image x="${logoX}" y="${logoY}" width="${logoWidth}" height="${logoHeight}" href="${brandLogo}" preserveAspectRatio="xMidYMid meet" />`
        : `<text x="${logoX + logoWidth / 2}" y="${
            centerY + textAdjustment
          }" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#333333" text-anchor="middle" dominant-baseline="central">${cameraMake}</text>`;

      const watermarkSvg = `
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

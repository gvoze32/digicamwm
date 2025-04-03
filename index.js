const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const ExifParser = require("exif-parser");
const { getDesignById } = require("./designs");

async function addWatermarkFrame(
  inputImagePath,
  outputPath,
  designId = "classic",
  photographerName = ""
) {
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
      dateTimeString,
      designId,
      photographerName
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
  dateTimeString,
  designId = "classic",
  photographerName = ""
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
      // Get the list of available model logos
      const logoDir = path.join(__dirname, "assets/models");
      const availableLogos = fs
        .readdirSync(logoDir)
        .filter((file) => file.endsWith(".png"))
        .map((file) => file.toLowerCase());

      // Normalize and split camera make into individual words
      const makeWords = cameraMake.toLowerCase().trim().split(/\s+/);

      // Find a matching logo by checking each word in the camera make
      let logoFileName = null;
      for (const word of makeWords) {
        // Skip very short words (like "co", "inc", etc.)
        if (word.length <= 2) continue;

        // Check if any logo filename contains this word
        const matchingLogo = availableLogos.find((logo) => {
          // Remove .png and compare with the current word
          const logoName = logo.replace(".png", "");
          return (
            logoName === word ||
            word.includes(logoName) ||
            logoName.includes(word)
          );
        });

        if (matchingLogo) {
          logoFileName = matchingLogo;
          break;
        }
      }

      if (logoFileName) {
        const logoPath = path.join(logoDir, logoFileName);
        const logoBuffer = fs.readFileSync(logoPath);
        const logoBase64 = logoBuffer.toString("base64");
        brandLogo = `data:image/png;base64,${logoBase64}`;
        console.log(
          `Found matching logo: ${logoFileName} for camera make: ${cameraMake}`
        );
      } else {
        console.log(`No matching logo found for camera make: ${cameraMake}`);
        brandLogo = null;
      }
    } catch (error) {
      console.log(
        `Error loading camera brand logo for ${cameraMake}:`,
        error.message
      );
      brandLogo = null;
    }

    const isPortrait = imageHeight > imageWidth;

    const selectedDesign = getDesignById(designId);

    if (isPortrait) {
      const centerX = imageWidth / 2;

      const logoHeight = Math.round(frameHeight * 0.5);
      const logoWidth = logoHeight * 1.5;

      const logoY = frameHeight * 0.8 - logoHeight / 2; // Changed from 0.875 to 0.7
      const logoX = centerX - logoWidth / 2;

      const logoElement = brandLogo
        ? `<image x="${logoX}" y="${logoY}" width="${logoWidth}" height="${logoHeight}" href="${brandLogo}" preserveAspectRatio="xMidYMid meet" />`
        : `<text x="${centerX}" y="${
            frameHeight * 0.8
          }" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#333333" text-anchor="middle" dominant-baseline="central">${cameraMake}</text>`;

      const watermarkSvg = selectedDesign.renderPortrait({
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
      });

      const watermarkBuffer = Buffer.from(watermarkSvg);

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
            input: watermarkBuffer,
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

      const watermarkSvg = selectedDesign.renderLandscape({
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
      });

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

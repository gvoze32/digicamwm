import fs from "fs";
import path from "path";
import sharp from "sharp";
import ExifParser, { ParserResult } from "exif-parser";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
interface PortraitRenderParams {
  imageWidth: number;
  frameHeight: number;
  centerX: number;
  logoElement: string;
  cameraInfo: string;
  exposureInfo: string;
  dateTimeString: string;
  fontSize: number;
  smallFontSize: number;
  photographerName: string;
}

interface LandscapeRenderParams {
  imageWidth: number;
  frameHeight: number;
  centerY: number;
  textAdjustment: number;
  logoAdjustment: number;
  logoElement: string;
  cameraInfo: string;
  exposureInfo: string;
  dateTimeString: string;
  leftTextX: number;
  rightTextX: number;
  exposureY: number;
  dateY: number;
  dividerX: number;
  adjustedDividerTop: number;
  adjustedDividerBottom: number;
  fontSize: number;
  smallFontSize: number;
  photographerName: string;
}

interface DesignDefinition {
  renderPortrait: (params: PortraitRenderParams) => string;
  renderLandscape: (params: LandscapeRenderParams) => string;
}

const { getDesignById, defaultDesign } = require("../../designs.js") as {
  getDesignById: (id: string) => DesignDefinition;
  defaultDesign: string;
};

export interface WatermarkOptions {
  buffer: Buffer;
  fileName: string;
  designId?: string;
  photographerName?: string;
}

export interface WatermarkResult {
  outputBuffer: Buffer;
  outputName: string;
  metadata: {
    cameraInfo: string;
    exposureInfo: string;
    timestamp: string;
    photographerName: string;
  };
}

const SUPPORTED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".tiff",
  ".webp",
]);

function normaliseFileExtension(name: string): string {
  const ext = path.extname(name).toLowerCase();
  if (SUPPORTED_EXTENSIONS.has(ext)) {
    return ext;
  }
  return ".jpg";
}

async function loadCameraLogo(cameraMake: string): Promise<string | null> {
  if (!cameraMake) {
    return null;
  }

  const candidateDirs = [
    path.resolve(process.cwd(), "public", "assets", "models"),
    path.resolve(process.cwd(), "..", "assets", "models"),
  ];

  const logoDir = candidateDirs.find((dir) => fs.existsSync(dir));
  if (!logoDir) {
    return null;
  }

  try {
    const availableLogos = fs
      .readdirSync(logoDir)
      .filter((file) => file.toLowerCase().endsWith(".png"))
      .map((file) => file.toLowerCase());

    const makeWords = cameraMake.toLowerCase().trim().split(/\s+/);

    let logoFileName: string | undefined;
    for (const word of makeWords) {
      if (word.length <= 2) continue;
      logoFileName = availableLogos.find((logo) => {
        const logoName = logo.replace(".png", "");
        return (
          logoName === word ||
          word.includes(logoName) ||
          logoName.includes(word)
        );
      });
      if (logoFileName) break;
    }

    if (!logoFileName) {
      return null;
    }

    const logoPath = path.join(logoDir, logoFileName);
    const logoBuffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch (error) {
    console.warn(`Failed to load camera brand logo for ${cameraMake}:`, error);
    return null;
  }
}

function buildExposureInfo({
  focalLength,
  fNumber,
  exposureTime,
  iso,
}: {
  focalLength?: string;
  fNumber?: string;
  exposureTime?: string;
  iso?: string;
}): string {
  const parts: string[] = [];
  if (focalLength) parts.push(focalLength);
  if (fNumber) parts.push(fNumber);
  if (exposureTime) parts.push(exposureTime);
  if (iso) parts.push(iso.startsWith("ISO") ? iso : `ISO ${iso}`);
  return parts.join(" | ");
}

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, ".");
  const timePart = date.toTimeString().slice(0, 8);
  return `${datePart} ${timePart}`;
}

async function composeWatermark(
  processedData: { data: Buffer; info: sharp.OutputInfo },
  options: {
    designId: string;
    photographerName: string;
    cameraMake: string;
    cameraModel: string;
    exposureInfo: string;
    timestamp: string;
    brandLogo: string | null;
  }
): Promise<Buffer> {
  const { info } = processedData;
  const imageWidth = info.width;
  const imageHeight = info.height;
  const frameHeight = Math.round(imageHeight * 0.1);
  const fontSize = Math.max(14, Math.round(frameHeight * 0.3));
  const smallFontSize = Math.max(11, Math.round(fontSize * 0.75));
  const isPortrait = imageHeight > imageWidth;
  const design = getDesignById(options.designId);
  const isMicroDesign = options.designId === "micro";

  let cameraInfo = options.cameraModel.trim();
  if (cameraInfo.includes("iPhone")) {
    cameraInfo = `Apple ${cameraInfo}`;
  }

  if (isPortrait) {
    const centerX = imageWidth / 2;
    const logoHeight = Math.round(frameHeight * 0.5);
    const logoWidth = logoHeight * 1.5;
    const logoY = frameHeight * 0.8 - logoHeight / 2;
    const logoX = centerX - logoWidth / 2;

    const logoElement = options.brandLogo
      ? `<image x="${logoX}" y="${logoY}" width="${logoWidth}" height="${logoHeight}" href="${options.brandLogo}" preserveAspectRatio="xMidYMid meet" />`
      : `<text x="${centerX}" y="${
          frameHeight * 0.8
        }" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#333333" text-anchor="middle" dominant-baseline="central">${
          options.cameraMake
        }</text>`;

    const watermarkSvg = design.renderPortrait({
      imageWidth,
      frameHeight,
      centerX,
      logoElement,
      cameraInfo,
      exposureInfo: options.exposureInfo,
      dateTimeString: options.timestamp,
      fontSize,
      smallFontSize,
      photographerName: options.photographerName,
    });

    const watermarkBuffer = Buffer.from(watermarkSvg);
    const finalFrameHeight = isMicroDesign
      ? Math.round(frameHeight * 0.5)
      : frameHeight * 2;

    return sharp(processedData.data)
      .withMetadata()
      .extend({
        top: 0,
        bottom: finalFrameHeight,
        left: 0,
        right: 0,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .composite([{ input: watermarkBuffer, top: imageHeight, left: 0 }])
      .toBuffer();
  }

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

  let exposureY: number;
  let dateY: number;
  if (options.exposureInfo && options.timestamp) {
    const lineSpacing = smallFontSize * 1.5;
    exposureY = centerY - lineSpacing / 2 + textAdjustment;
    dateY = centerY + lineSpacing / 2 + textAdjustment;
  } else {
    exposureY = centerY + textAdjustment;
    dateY = centerY + textAdjustment;
  }

  const adjustedDividerTop = centerY - dividerHeight / 2 + logoAdjustment;
  const adjustedDividerBottom = centerY + dividerHeight / 2 + logoAdjustment;

  const logoElement = options.brandLogo
    ? `<image x="${logoX}" y="${logoY}" width="${logoWidth}" height="${logoHeight}" href="${options.brandLogo}" preserveAspectRatio="xMidYMid meet" />`
    : `<text x="${logoX + logoWidth / 2}" y="${
        centerY + textAdjustment
      }" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#333333" text-anchor="middle" dominant-baseline="central">${
        options.cameraMake
      }</text>`;

  const watermarkSvg = design.renderLandscape({
    imageWidth,
    frameHeight,
    centerY,
    textAdjustment,
    logoAdjustment,
    logoElement,
    cameraInfo,
    exposureInfo: options.exposureInfo,
    dateTimeString: options.timestamp,
    leftTextX,
    rightTextX,
    exposureY,
    dateY,
    dividerX,
    adjustedDividerTop,
    adjustedDividerBottom,
    fontSize,
    smallFontSize,
    photographerName: options.photographerName,
  });

  const watermarkBuffer = Buffer.from(watermarkSvg);
  const finalFrameHeight = isMicroDesign
    ? Math.round(frameHeight * 0.5)
    : frameHeight;

  return sharp(processedData.data)
    .withMetadata()
    .extend({
      top: 0,
      bottom: finalFrameHeight,
      left: 0,
      right: 0,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .composite([{ input: watermarkBuffer, top: imageHeight, left: 0 }])
    .toBuffer();
}

export async function applyWatermark({
  buffer,
  fileName,
  designId = defaultDesign,
  photographerName = "",
}: WatermarkOptions): Promise<WatermarkResult> {
  const imageBuffer = Buffer.from(buffer);

  let exifData: ParserResult | undefined;
  try {
    const parser = ExifParser.create(imageBuffer);
    exifData = parser.parse();
  } catch (error) {
    console.warn("Failed to read EXIF data", error);
  }

  const processedImage = sharp(imageBuffer, { failOnError: false }).rotate();
  const processedMetadata = await processedImage.toBuffer({
    resolveWithObject: true,
  });

  const cameraModel = exifData?.tags?.Model
    ? String(exifData.tags.Model)
    : "Unknown Camera";
  const cameraMake = exifData?.tags?.Make ? String(exifData.tags.Make) : "";

  const focalLength = exifData?.tags?.FocalLength
    ? `${Math.round(exifData.tags.FocalLength)}mm`
    : undefined;
  const fNumber = exifData?.tags?.FNumber
    ? `f/${exifData.tags.FNumber.toFixed(1)}`
    : undefined;
  const exposureTime = exifData?.tags?.ExposureTime
    ? `1/${Math.round(1 / exifData.tags.ExposureTime)}`
    : undefined;
  const iso = exifData?.tags?.ISO ? `ISO ${exifData.tags.ISO}` : undefined;
  const timestamp = formatDateTime(exifData?.tags?.DateTimeOriginal);

  const brandLogo = await loadCameraLogo(cameraMake);
  const exposureInfo = buildExposureInfo({
    focalLength,
    fNumber,
    exposureTime,
    iso,
  });

  const outputBuffer = await composeWatermark(processedMetadata, {
    designId,
    photographerName,
    cameraMake,
    cameraModel,
    exposureInfo,
    timestamp,
    brandLogo,
  });

  const extension = normaliseFileExtension(fileName);
  const baseName = path.basename(fileName, path.extname(fileName));
  const outputName = `${baseName}_watermarked${extension}`;

  return {
    outputBuffer,
    outputName,
    metadata: {
      cameraInfo: cameraModel,
      exposureInfo,
      timestamp,
      photographerName,
    },
  };
}

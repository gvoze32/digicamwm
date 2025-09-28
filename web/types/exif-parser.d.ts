declare module "exif-parser" {
  export interface Tags {
    Model?: string;
    Make?: string;
    FocalLength?: number;
    FNumber?: number;
    ExposureTime?: number;
    ISO?: number;
    DateTimeOriginal?: number;
  }

  export interface ParserResult {
    tags?: Tags;
  }

  export interface ExifParserStatic {
    create(buffer: Buffer): {
      parse(): ParserResult;
    };
  }

  const ExifParser: ExifParserStatic;
  export default ExifParser;
}

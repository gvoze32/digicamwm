export interface Design {
  id: string;
  name: string;
  description: string;
  thumbnails: {
    landscape: string;
    portrait: string;
  };
}

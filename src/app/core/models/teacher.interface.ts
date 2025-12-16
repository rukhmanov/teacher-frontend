import { User } from './user.interface';

export enum SocialPlatform {
  VK = 'VK',
  TELEGRAM = 'TELEGRAM',
  WEBSITE = 'WEBSITE',
  MESSENGER_MAX = 'MESSENGER_MAX',
}

export interface TeacherProfile {
  id: string;
  userId: string;
  user?: User;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  bio?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
  socialLinks?: SocialLink[];
}

export interface Post {
  id: string;
  teacherId: string;
  title: string;
  content: string;
  images?: string[];
  videos?: string[];
  cardColor?: string;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MasterClass {
  id: string;
  teacherId: string;
  title: string;
  description?: string;
  content?: string;
  images?: string[];
  videos?: string[];
  cardColor?: string;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Presentation {
  id: string;
  teacherId: string;
  title: string;
  description?: string;
  fileUrl: string;
  previewImage?: string;
  cardColor?: string;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParentSection {
  id: string;
  teacherId: string;
  title: string;
  content?: string;
  files?: string[];
  cardColor?: string;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaItem {
  type: 'photo' | 'video';
  url: string;
  caption?: string;
}

export interface LifeInDOU {
  id: string;
  teacherId: string;
  mediaItems?: MediaItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialLink {
  id: string;
  teacherId: string;
  platform: SocialPlatform;
  url: string;
  customName?: string;
  iconUrl?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhitelistEmail {
  id: string;
  email: string;
  addedBy?: string;
  createdAt: Date;
}


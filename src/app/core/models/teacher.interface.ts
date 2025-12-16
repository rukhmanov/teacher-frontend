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
  createdAt: Date;
  updatedAt: Date;
}

export interface ParentSection {
  id: string;
  teacherId: string;
  title: string;
  content?: string;
  files?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LifeInDOU {
  id: string;
  teacherId: string;
  title: string;
  description?: string;
  photos?: string[];
  videos?: string[];
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


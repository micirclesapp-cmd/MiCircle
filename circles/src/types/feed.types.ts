export type CircleCategory =
  | 'travel'
  | 'fitness'
  | 'music'
  | 'food'
  | 'hobby'
  | 'neighbourhood'
  | 'professional'
  | 'other';

export type JoinMode = 'open' | 'approval';

export type TransitMode = 'train' | 'flight' | 'bus';

export interface OpenCircle {
  id: string;
  name: string;
  category: CircleCategory;
  pitch: string;
  location?: string;
  city?: string;
  geoLocation?: {
    latitude: number;
    longitude: number;
  };
  transitMode?: TransitMode;
  transitRoute?: string;
  transitDate?: string;
  tags: string[];
  joinMode: JoinMode;
  creatorUid: string;
  creatorName: string;
  creatorAvatar: string;
  creatorJoinYear: number;
  memberCount: number;
  members: string[]; // uids only
  memberJoinTimestamps?: Array<{ uid: string; timestamp: number }>; // Track when members join
  joinVelocity?: number; // Members joined in last 24 hours
  joinRequests?: string[]; // uids
  createdAt: number;
  isArchived: boolean;
  isPromoted?: boolean;
}

export interface UserPreferences {
  uid: string;
  categoryAffinity: {
    travel: number;
    fitness: number;
    music: number;
    food: number;
    hobby: number;
    neighbourhood: number;
    professional: number;
    other: number;
  };
  recentSearches?: Array<{
    transitRoute: string;
    transitDate: string;
    timestamp: number;
  }>;
  currentLocation?: {
    latitude: number;
    longitude: number;
    city: string;
  };
  lastUpdated: number;
}

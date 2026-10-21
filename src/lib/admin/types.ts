export type MediaStatus = "pending" | "published" | "failed";

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
  is_superadmin: boolean;
};

export type Media = {
  id: string;
  user_id: string;
  artist_id: string;
  mood: string;
  scene: string;
  prompt: string;
  title: string | null;
  caption: string | null;
  model: string | null;
  status: MediaStatus;
  created_at: string;
};

export type Vote = {
  id: string;
  generation_id: string;
  user_id: string;
  value: -1 | 1;
  created_at: string;
};

export type PageResult<T> = { rows: T[]; total: number };

export type Dashboard = {
  total_profiles: number;
  total_media: number;
  total_votes: number;
  upvotes: number;
  downvotes: number;
  published_media: number;
  unrated_media: number;
  activity: { label: string; value: number }[];
  types: { label: string; value: number }[];
  top_media: {
    id: string;
    title: string | null;
    status: MediaStatus;
    votes: number;
    upvotes: number;
    downvotes: number;
  }[];
};

export type MediaInput = Pick<
  Media,
  "artist_id" | "mood" | "scene" | "prompt" | "title" | "caption" | "model" | "status"
>;

export type ActionState = {
  message?: string;
  errors?: Partial<Record<keyof MediaInput | "id" | "confirmation", string>>;
};

export interface UserData {
  name: string;
  partnerName: string;
  email: string;
}

export interface Summary {
  id: string;
  title: string;
  summary: string;
  key_points: string[];
  action_items: string[];
  next_steps: string[];
  created_at: string;
}
